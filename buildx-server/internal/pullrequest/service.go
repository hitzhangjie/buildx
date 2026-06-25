package pullrequest

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// ProjectGit provides git directory access for a project.
type ProjectGit interface {
	GitDir(projectID int64) string
}

// Service coordinates pull request business logic and git operations.
type Service struct {
	Store   *DBStore
	Project ProjectGit
}

func (s *Service) Open(ctx context.Context, data *model.PullRequestOpenData, submitter *model.User) (*model.PullRequest, error) {
	if data == nil || submitter == nil {
		return nil, errors.New("invalid open data")
	}
	targetBranch := strings.TrimSpace(data.TargetBranch)
	sourceBranch := strings.TrimSpace(data.SourceBranch)
	if targetBranch == "" || sourceBranch == "" {
		return nil, errors.New("branches are required")
	}

	targetGit := s.Project.GitDir(data.TargetProjectID)
	sourceGit := s.Project.GitDir(data.SourceProjectID)
	if err := ensureBranchExists(targetGit, targetBranch); err != nil {
		return nil, err
	}
	if data.SourceProjectID != data.TargetProjectID {
		if err := ensureBranchExists(sourceGit, sourceBranch); err != nil {
			return nil, err
		}
	} else if err := ensureBranchExists(targetGit, sourceBranch); err != nil {
		return nil, err
	}

	repo, err := git.Open(targetGit)
	if err != nil {
		return nil, fmt.Errorf("open git repo: %w", err)
	}
	baseHash, err := repo.MergeBase(targetBranch, sourceBranch)
	if err != nil {
		return nil, fmt.Errorf("merge base: %w", err)
	}
	buildHash, err := repo.ResolveCommitHash(sourceBranch)
	if err != nil {
		return nil, fmt.Errorf("resolve source branch: %w", err)
	}

	pr := &model.PullRequest{
		Title:           strings.TrimSpace(data.Title),
		Description:     data.Description,
		TargetProject:   &model.Project{ID: data.TargetProjectID},
		SourceProject:   &model.Project{ID: data.SourceProjectID},
		TargetBranch:    targetBranch,
		SourceBranch:    sourceBranch,
		MergeStrategy:   data.MergeStrategy,
		BaseCommitHash:  baseHash,
		BuildCommitHash: buildHash,
	}
	created, err := s.Store.Create(ctx, pr, submitter.ID)
	if err != nil {
		return nil, err
	}

	for _, reviewerID := range data.ReviewerIDs {
		if reviewerID == submitter.ID {
			continue
		}
		_, _ = s.Store.CreateOrUpdateReview(ctx, &model.PullRequestReview{
			RequestID: created.ID,
			User:      &model.User{ID: reviewerID},
			Status:    model.PullRequestReviewPending,
		})
	}
	for _, assigneeID := range data.AssigneeIDs {
		if assigneeID == submitter.ID {
			continue
		}
		_, _ = s.Store.CreateAssignment(ctx, created.ID, assigneeID)
	}
	return created, nil
}

func (s *Service) MergePreview(ctx context.Context, pr *model.PullRequest) (*model.MergePreview, error) {
	if pr == nil {
		return nil, errors.New("pull request is nil")
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		return nil, err
	}
	sourceHash, err := repo.ResolveCommitHash(pr.SourceBranch)
	if err != nil {
		return nil, ErrBranchNotFound
	}
	conflicted, err := hasMergeConflict(gitDir, pr.TargetBranch, sourceHash)
	if err != nil {
		return nil, err
	}
	preview := &model.MergePreview{
		HeadCommitHash: sourceHash,
		Conflicted:     conflicted,
	}
	if !conflicted {
		preview.MergeCommitHash, _ = simulateMergeCommit(gitDir, pr.TargetBranch, sourceHash)
	}
	return preview, nil
}

func (s *Service) Merge(ctx context.Context, pr *model.PullRequest, user *model.User, note string) error {
	if pr == nil || !pr.IsOpen() {
		return ErrNotOpen
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		return err
	}
	sourceHash, err := repo.ResolveCommitHash(pr.SourceBranch)
	if err != nil {
		return ErrBranchNotFound
	}
	conflicted, err := hasMergeConflict(gitDir, pr.TargetBranch, sourceHash)
	if err != nil {
		return err
	}
	if conflicted {
		return ErrMergeConflict
	}

	mergedHash, err := performMerge(gitDir, pr.TargetBranch, pr.SourceBranch, sourceHash, pr.Title, user, pr.MergeStrategy)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	if err := s.Store.SetBuildCommitHash(ctx, pr.ID, mergedHash); err != nil {
		return err
	}
	if err := s.Store.SetStatus(ctx, pr.ID, model.PullRequestStatusMerged, &now); err != nil {
		return err
	}
	if strings.TrimSpace(note) != "" && user != nil {
		_, _ = s.Store.CreateComment(ctx, &model.PullRequestComment{
			RequestID: pr.ID,
			User:      user,
			Content:   note,
		})
	}
	return nil
}

func (s *Service) Discard(ctx context.Context, pr *model.PullRequest, user *model.User, note string) error {
	if pr == nil || !pr.IsOpen() {
		return ErrNotOpen
	}
	now := time.Now().UTC()
	if err := s.Store.SetStatus(ctx, pr.ID, model.PullRequestStatusDiscarded, &now); err != nil {
		return err
	}
	if strings.TrimSpace(note) != "" && user != nil {
		_, _ = s.Store.CreateComment(ctx, &model.PullRequestComment{
			RequestID: pr.ID,
			User:      user,
			Content:   note,
		})
	}
	return nil
}

func (s *Service) Reopen(ctx context.Context, pr *model.PullRequest, user *model.User, note string) error {
	if pr == nil || pr.Status != model.PullRequestStatusDiscarded {
		return errors.New("pull request is not discarded")
	}
	if err := s.Store.SetStatus(ctx, pr.ID, model.PullRequestStatusOpen, nil); err != nil {
		return err
	}
	if strings.TrimSpace(note) != "" && user != nil {
		_, _ = s.Store.CreateComment(ctx, &model.PullRequestComment{
			RequestID: pr.ID,
			User:      user,
			Content:   note,
		})
	}
	return nil
}

func (s *Service) Review(ctx context.Context, pr *model.PullRequest, user *model.User, approved bool, note string) error {
	if pr == nil || !pr.IsOpen() || user == nil {
		return ErrNotOpen
	}
	status := model.PullRequestReviewRequestedForChanges
	if approved {
		status = model.PullRequestReviewApproved
	}
	_, err := s.Store.CreateOrUpdateReview(ctx, &model.PullRequestReview{
		RequestID: pr.ID,
		User:      user,
		Status:    status,
	})
	if err != nil {
		return err
	}
	if strings.TrimSpace(note) != "" {
		_, _ = s.Store.CreateComment(ctx, &model.PullRequestComment{
			RequestID: pr.ID,
			User:      user,
			Content:   note,
		})
	}
	return nil
}

func (s *Service) DeleteSourceBranch(ctx context.Context, pr *model.PullRequest) error {
	if pr == nil || pr.Status != model.PullRequestStatusMerged {
		return errors.New("pull request must be merged to delete source branch")
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	if err := ensureBranchExists(gitDir, pr.SourceBranch); err != nil {
		return err
	}
	cmd := exec.Command("git", "-C", gitDir, "branch", "-D", pr.SourceBranch)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("delete source branch: %s: %w", strings.TrimSpace(string(out)), err)
	}
	return s.Store.SetSourceBranchDeleted(ctx, pr.ID, true)
}

func (s *Service) RestoreSourceBranch(ctx context.Context, pr *model.PullRequest) error {
	if pr == nil || !pr.IsOpen() {
		return ErrNotOpen
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	hash := pr.BuildCommitHash
	if hash == "" {
		hash = pr.BaseCommitHash
	}
	if hash == "" {
		return errors.New("no commit hash to restore")
	}
	cmd := exec.Command("git", "-C", gitDir, "branch", pr.SourceBranch, hash)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("restore source branch: %s: %w", strings.TrimSpace(string(out)), err)
	}
	return s.Store.SetSourceBranchDeleted(ctx, pr.ID, false)
}

func (s *Service) Synchronize(ctx context.Context, pr *model.PullRequest) error {
	if pr == nil || !pr.IsOpen() {
		return ErrNotOpen
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		return err
	}
	buildHash, err := repo.ResolveCommitHash(pr.SourceBranch)
	if err != nil {
		return ErrBranchNotFound
	}
	return s.Store.SetBuildCommitHash(ctx, pr.ID, buildHash)
}

func (s *Service) ChangeTargetBranch(ctx context.Context, pr *model.PullRequest, newTarget string) error {
	if pr == nil || !pr.IsOpen() {
		return ErrNotOpen
	}
	newTarget = strings.TrimSpace(newTarget)
	if newTarget == "" {
		return errors.New("target branch is required")
	}
	if newTarget == pr.TargetBranch {
		return errors.New("target branch is the same")
	}
	gitDir := s.Project.GitDir(pr.TargetProject.ID)
	if err := ensureBranchExists(gitDir, newTarget); err != nil {
		return err
	}
	return s.Store.SetTargetBranch(ctx, pr.ID, newTarget)
}

func (s *Service) Delete(ctx context.Context, pr *model.PullRequest) error {
	if pr == nil {
		return ErrNotFound
	}
	return s.Store.Delete(ctx, pr.ID)
}

// ParseQuery converts a subset of OneDev pull request query syntax into options.
func ParseQuery(query string, projectPathByID map[int64]string) QueryOptions {
	opts := QueryOptions{Count: 100}
	q := strings.TrimSpace(query)
	if q == "" {
		return opts
	}
	lower := strings.ToLower(q)

	// Keyword-based status.
	if strings.Contains(lower, "open") && !strings.Contains(lower, "reopen") {
		open := model.PullRequestStatusOpen
		opts.Status = &open
	}
	if strings.Contains(lower, "merged") {
		merged := model.PullRequestStatusMerged
		opts.Status = &merged
	}
	if strings.Contains(lower, "discarded") {
		discarded := model.PullRequestStatusDiscarded
		opts.Status = &discarded
	}

	// "Target Project" is "path"
	projectPath := extractQuotedValue(lower, "target project is")
	if projectPath == "" {
		projectPath = extractQuotedValue(lower, `"target project" is`)
	}
	if projectPath != "" {
		for id, p := range projectPathByID {
			if strings.EqualFold(p, projectPath) {
				opts.TargetProjectID = &id
				break
			}
		}
	}

	// "Status" is "OPEN"/"MERGED"/"DISCARDED" (can appear multiple times via "and"/"or").
	statuses := extractMultiValues(lower, "status is")
	if len(statuses) == 0 {
		statuses = extractMultiValues(lower, `"status" is`)
	}
	for _, s := range statuses {
		switch strings.ToUpper(s) {
		case "OPEN":
			opts.Statuses = append(opts.Statuses, model.PullRequestStatusOpen)
		case "MERGED":
			opts.Statuses = append(opts.Statuses, model.PullRequestStatusMerged)
		case "DISCARDED":
			opts.Statuses = append(opts.Statuses, model.PullRequestStatusDiscarded)
		}
	}

	// "Last Activity Date" is since/until "YYYY-MM-DD"
	if d := extractQuotedValue(lower, "last activity date\" is since"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			opts.LastActivitySince = &t
		}
	}
	if d := extractQuotedValue(lower, "last activity date\" is until"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			opts.LastActivityUntil = &t
		}
	}
	if d := extractQuotedValue(lower, "last activity date is since"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			opts.LastActivitySince = &t
		}
	}
	if d := extractQuotedValue(lower, "last activity date is until"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			opts.LastActivityUntil = &t
		}
	}

	// Includes Issue.
	if path, num, ok := ParseIncludesIssueQuery(query); ok {
		opts.IncludesIssueNumber = num
		opts.IncludesIssuePattern = fmt.Sprintf("%%#%d%%", num)
		for id, p := range projectPathByID {
			if strings.EqualFold(p, path) {
				opts.TargetProjectID = &id
				break
			}
		}
	}
	return opts
}

// extractMultiValues extracts all quoted values for a given criterion prefix.
// Handles multiple occurrences joined by "and" or "or".
func extractMultiValues(query, prefix string) []string {
	var values []string
	lower := strings.ToLower(query)
	idx := 0
	for {
		rest := lower[idx:]
		pos := strings.Index(rest, strings.ToLower(prefix))
		if pos < 0 {
			break
		}
		after := rest[pos+len(prefix):]
		after = strings.TrimSpace(after)
		if !strings.HasPrefix(after, `"`) {
			idx += pos + len(prefix)
			continue
		}
		after = after[1:]
		end := strings.Index(after, `"`)
		if end < 0 {
			break
		}
		values = append(values, after[:end])
		idx += pos + len(prefix) + 1 + end + 1
	}
	return values
}

func extractQuotedValue(query, prefix string) string {
	idx := strings.Index(strings.ToLower(query), strings.ToLower(prefix))
	if idx < 0 {
		return ""
	}
	rest := query[idx+len(prefix):]
	rest = strings.TrimSpace(rest)
	if !strings.HasPrefix(rest, `"`) {
		return ""
	}
	rest = rest[1:]
	end := strings.Index(rest, `"`)
	if end < 0 {
		return ""
	}
	return rest[:end]
}

func ensureBranchExists(gitDir, branch string) error {
	repo, err := git.Open(gitDir)
	if err != nil {
		return err
	}
	if _, err := repo.ResolveCommitHash(branch); err != nil {
		return ErrBranchNotFound
	}
	return nil
}

func hasMergeConflict(gitDir, targetBranch, sourceHash string) (bool, error) {
	if _, err := exec.LookPath("git"); err != nil {
		return false, errors.New("git not found")
	}
	targetHash, err := resolveRef(gitDir, targetBranch)
	if err != nil {
		return false, err
	}
	base, err := mergeBase(gitDir, targetHash, sourceHash)
	if err != nil {
		return false, err
	}
	if base == targetHash {
		return false, nil
	}
	out, err := exec.Command("git", "-C", gitDir, "merge-tree", base, targetHash, sourceHash).CombinedOutput()
	if err != nil {
		return false, fmt.Errorf("merge-tree: %w", err)
	}
	return strings.Contains(string(out), "changed in both") || strings.Contains(string(out), "CONFLICT"), nil
}

func simulateMergeCommit(gitDir, targetBranch, sourceHash string) (string, error) {
	targetHash, err := resolveRef(gitDir, targetBranch)
	if err != nil {
		return "", err
	}
	base, err := mergeBase(gitDir, targetHash, sourceHash)
	if err != nil {
		return "", err
	}
	if base == targetHash {
		return sourceHash, nil
	}
	return mergeTreeCommit(gitDir, base, targetHash, sourceHash, "Merge preview")
}

func performMerge(gitDir, targetBranch, sourceBranch, sourceHash, title string, user *model.User, strategy model.MergeStrategy) (string, error) {
	if strategy == model.MergeStrategySquashSourceBranchCommits {
		return performSquashMerge(gitDir, targetBranch, sourceBranch, title, user)
	}
	targetHash, err := resolveRef(gitDir, targetBranch)
	if err != nil {
		return "", err
	}
	base, err := mergeBase(gitDir, targetHash, sourceHash)
	if err != nil {
		return "", err
	}
	if base == targetHash {
		ref := "refs/heads/" + targetBranch
		if err := updateRef(gitDir, ref, sourceHash); err != nil {
			return "", err
		}
		return sourceHash, nil
	}
	if strategy == model.MergeStrategyCreateMergeCommitIfNecessary {
		mergeMsg := "Merge pull request: " + title
		if user != nil && user.Name != "" {
			mergeMsg += "\n\nMerged-by: " + user.Name
		}
		mergedHash, err := mergeTreeCommit(gitDir, base, targetHash, sourceHash, mergeMsg)
		if err != nil {
			return "", err
		}
		ref := "refs/heads/" + targetBranch
		if err := updateRef(gitDir, ref, mergedHash); err != nil {
			return "", err
		}
		return mergedHash, nil
	}
	mergeMsg := "Merge pull request: " + title
	if user != nil && user.Name != "" {
		mergeMsg += "\n\nMerged-by: " + user.Name
	}
	mergedHash, err := mergeTreeCommit(gitDir, base, targetHash, sourceHash, mergeMsg)
	if err != nil {
		return "", err
	}
	ref := "refs/heads/" + targetBranch
	if err := updateRef(gitDir, ref, mergedHash); err != nil {
		return "", err
	}
	return mergedHash, nil
}

func performSquashMerge(gitDir, targetBranch, sourceBranch, title string, user *model.User) (string, error) {
	targetHash, err := resolveRef(gitDir, targetBranch)
	if err != nil {
		return "", err
	}
	sourceHash, err := resolveRef(gitDir, sourceBranch)
	if err != nil {
		return "", err
	}
	msg := "Squash merge pull request: " + title
	if user != nil && user.Name != "" {
		msg += "\n\nMerged-by: " + user.Name
	}
	shell := fmt.Sprintf(
		`tree=$(git -C %q rev-parse %q^{tree}) && git -C %q commit-tree "$tree" -p %q -m %q`,
		gitDir, sourceHash, gitDir, targetHash, msg,
	)
	cmd := exec.Command("bash", "-c", shell)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("squash merge: %w", err)
	}
	squashHash := strings.TrimSpace(string(out))
	ref := "refs/heads/" + targetBranch
	if err := updateRef(gitDir, ref, squashHash); err != nil {
		return "", err
	}
	return squashHash, nil
}

func resolveRef(gitDir, revision string) (string, error) {
	cmd := exec.Command("git", "-C", gitDir, "rev-parse", revision)
	out, err := cmd.Output()
	if err != nil {
		return "", ErrBranchNotFound
	}
	return strings.TrimSpace(string(out)), nil
}

func mergeBase(gitDir, a, b string) (string, error) {
	cmd := exec.Command("git", "-C", gitDir, "merge-base", a, b)
	out, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func updateRef(gitDir, ref, hash string) error {
	cmd := exec.Command("git", "-C", gitDir, "update-ref", ref, hash)
	return cmd.Run()
}

func mergeTreeCommit(gitDir, base, targetHash, sourceHash, message string) (string, error) {
	cmd := exec.Command("git", "-C", gitDir, "commit-tree",
		"-p", targetHash,
		"-p", sourceHash,
		"-m", message,
		"$(git -C "+gitDir+" merge-tree "+base+" "+targetHash+" "+sourceHash+" | git -C "+gitDir+" hash-object -t tree --stdin)",
	)
	// commit-tree needs tree from merge-tree; use shell for pipeline
	shell := fmt.Sprintf(
		`tree=$(git -C %q merge-tree %q %q %q | git -C %q hash-object -t tree --stdin) && git -C %q commit-tree "$tree" -p %q -p %q -m %q`,
		gitDir, base, targetHash, sourceHash, gitDir, gitDir, targetHash, sourceHash, message,
	)
	cmd = exec.Command("bash", "-c", shell)
	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("merge commit: %w", err)
	}
	return strings.TrimSpace(string(out)), nil
}
