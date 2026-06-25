package job

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/robfig/cron/v3"
)

// JobSchedule caches a cron schedule for a project branch + job.
type JobSchedule struct {
	ProjectID  int64
	Branch     string
	CommitHash string
	JobName    string
	Cron       string
	Reason     string
	schedule   cron.Schedule
}

// ScheduleCache holds branch schedule entries (single-node; maps to Hazelcast branchSchedules).
type ScheduleCache struct {
	mu    sync.RWMutex
	items map[string][]JobSchedule
}

// NewScheduleCache creates an empty schedule cache.
func NewScheduleCache() *ScheduleCache {
	return &ScheduleCache{items: make(map[string][]JobSchedule)}
}

func scheduleKey(projectID int64, branch string) string {
	return strconv.FormatInt(projectID, 10) + ":" + branch
}

var cronParser = cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.DowOptional)

// CacheBranchSchedules rebuilds schedule entries for a project branch at commit.
func (s *Service) CacheBranchSchedules(ctx context.Context, projectID int64, branch, commitHash string) {
	if s.scheduleCache == nil {
		return
	}
	spec, _, err := s.loadBuildSpec(ctx, projectID, commitHash, branch)
	if err != nil {
		s.scheduleCache.remove(scheduleKey(projectID, branch))
		return
	}
	var schedules []JobSchedule
	for _, jobDef := range spec.Jobs {
		for _, tr := range jobDef.Triggers {
			st, ok := tr.(*buildspec.ScheduleTrigger)
			if !ok || st.CronExpression == "" {
				continue
			}
			sched, err := cronParser.Parse(st.CronExpression)
			if err != nil {
				continue
			}
			schedules = append(schedules, JobSchedule{
				ProjectID:  projectID,
				Branch:     branch,
				CommitHash: commitHash,
				JobName:    jobDef.Name,
				Cron:       st.CronExpression,
				Reason:     "Scheduled trigger",
				schedule:   sched,
			})
		}
	}
	s.scheduleCache.set(scheduleKey(projectID, branch), schedules)
}

func (c *ScheduleCache) set(key string, schedules []JobSchedule) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(schedules) == 0 {
		delete(c.items, key)
		return
	}
	c.items[key] = schedules
}

func (c *ScheduleCache) remove(key string) {
	c.mu.Lock()
	delete(c.items, key)
	c.mu.Unlock()
}

func (c *ScheduleCache) snapshot() map[string][]JobSchedule {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string][]JobSchedule, len(c.items))
	for k, v := range c.items {
		cp := make([]JobSchedule, len(v))
		copy(cp, v)
		out[k] = cp
	}
	return out
}

// StartScheduleTicker runs a minute tick that submits/resubmits scheduled jobs.
func (s *Service) StartScheduleTicker(ctx context.Context) {
	go s.runScheduleTicker(ctx)
}

func (s *Service) runScheduleTicker(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			s.fireDueSchedules(ctx, now)
		}
	}
}

func (s *Service) fireDueSchedules(ctx context.Context, now time.Time) {
	if s.scheduleCache == nil {
		return
	}
	nextCheck := now.Add(time.Minute)
	for key, schedules := range s.scheduleCache.snapshot() {
		projectID, branch := parseScheduleKey(key)
		if projectID == 0 {
			continue
		}
		for _, sched := range schedules {
			if sched.schedule == nil {
				continue
			}
			nextFire := sched.schedule.Next(now.Add(-time.Second))
			if nextFire.IsZero() || nextFire.After(nextCheck) {
				continue
			}
			b, err := s.Submit(ctx, SubmitRequest{
				ProjectID:   projectID,
				CommitHash:  sched.CommitHash,
				JobName:     sched.JobName,
				RefName:     branch,
				Reason:      sched.Reason,
				SubmitterID: model.UserRootID,
			})
			if err != nil || b == nil {
				continue
			}
			if NewBuildStateMachine(b).IsTerminal() {
				_, _ = s.Resubmit(ctx, b.ID, sched.Reason)
			}
		}
	}
}

func parseScheduleKey(key string) (projectID int64, branch string) {
	for i := 0; i < len(key); i++ {
		if key[i] == ':' {
			projectID, _ = strconv.ParseInt(key[:i], 10, 64)
			branch = key[i+1:]
			return
		}
	}
	return 0, ""
}

func (s *Service) cacheSchedulesAfterRef(ctx context.Context, projectID int64, refName, commitHash string) {
	if refName == "" {
		return
	}
	s.CacheBranchSchedules(ctx, projectID, refName, commitHash)
}

// acquireSequentialLock tries to acquire a sequential group lock for the job timeout window.
func (s *Service) acquireSequentialLock(group string, timeoutSec int64) bool {
	if group == "" {
		return true
	}
	if timeoutSec <= 0 {
		timeoutSec = buildspec.DefaultTimeout
	}
	deadline := time.Now().Add(time.Duration(timeoutSec) * time.Second)
	s.mu.Lock()
	defer s.mu.Unlock()
	if exp, ok := s.seqLocks[group]; ok && exp.After(time.Now()) {
		return false
	}
	s.seqLocks[group] = deadline
	return true
}

func (s *Service) releaseSequentialLock(group string) {
	if group == "" {
		return
	}
	s.mu.Lock()
	delete(s.seqLocks, group)
	s.mu.Unlock()
}

// queryLatestBuild helper removed — schedule resubmit uses Submit idempotency.