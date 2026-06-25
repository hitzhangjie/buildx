package git

import (
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// ---------------------------------------------------------------------------
// Commit query types — parse OneDev-style commit query strings into structured
// criteria, then apply those criteria when iterating git log.
// ---------------------------------------------------------------------------

// RevisionType discriminates the kind of revision in a revision criterion.
type RevisionType string

const (
	RevisionBranch RevisionType = "branch"
	RevisionTag    RevisionType = "tag"
	RevisionCommit RevisionType = "commit"
)

// RevisionCriteria filters commits reachable from (or since) a specific ref.
// Maps to OneDev: RevisionCriteria(Revision.Type.BRANCH/TAG/COMMIT)
type RevisionCriteria struct {
	Type    RevisionType `json:"type"`
	Value   string       `json:"value"`
	Exclude bool         `json:"exclude"` // true = "since" (exclude reachable), false = "until" (start from)
}

// OrderType represents commit ordering.
type OrderType string

const (
	OrderDate       OrderType = "date"
	OrderAuthorDate OrderType = "author-date"
	OrderTopo       OrderType = "topo"
)

// ByMeType records which "by-me" shortcuts were requested.
type ByMeType int

const (
	ByMeNone      ByMeType = 0
	ByMeAuthor    ByMeType = 1 << 0
	ByMeCommitter ByMeType = 1 << 1
)

// CommitQuery holds the parsed criteria from a OneDev commit query string.
type CommitQuery struct {
	Revisions     []RevisionCriteria `json:"revisions,omitempty"`
	DefaultBranch bool               `json:"defaultBranch,omitempty"`
	Before        string             `json:"before,omitempty"`
	After         string             `json:"after,omitempty"`
	Authors       []string           `json:"authors,omitempty"`
	Committers    []string           `json:"committers,omitempty"`
	Paths         []string           `json:"paths,omitempty"`
	Messages      []string           `json:"messages,omitempty"`
	Order         OrderType          `json:"order,omitempty"`
	Fuzzy         string             `json:"fuzzy,omitempty"`
	ByMe          ByMeType           `json:"byMe,omitempty"`
}

// IsEmpty returns true when no criteria are set.
func (q *CommitQuery) IsEmpty() bool {
	return q == nil || (len(q.Revisions) == 0 &&
		!q.DefaultBranch &&
		q.Before == "" &&
		q.After == "" &&
		len(q.Authors) == 0 &&
		len(q.Committers) == 0 &&
		len(q.Paths) == 0 &&
		len(q.Messages) == 0 &&
		q.Order == "" &&
		q.Fuzzy == "" &&
		q.ByMe == ByMeNone)
}

// ---------------------------------------------------------------------------
// Regex patterns for OneDev commit query syntax.
// Whitespace separates criteria. Each criterion has the form KEYWORD(VALUE)
// (with matching parens) or a bare keyword.
// ---------------------------------------------------------------------------

var (
	// revision: (until|since) (branch|tag|commit)\(([^)]+)\)
	revisionRe = regexp.MustCompile(`\b(until|since)\s+(branch|tag|commit)\(([^)]+)\)`)

	// default-branch
	defaultBranchRe = regexp.MustCompile(`\bdefault-branch\b`)

	// before(date_value)
	beforeRe = regexp.MustCompile(`\bbefore\(([^)]+)\)`)

	// after(date_value)
	afterRe = regexp.MustCompile(`\bafter\(([^)]+)\)`)

	// author(name)
	authorRe = regexp.MustCompile(`\bauthor\(([^)]+)\)`)

	// authored-by-me
	authoredByMeRe = regexp.MustCompile(`\bauthored-by-me\b`)

	// committer(name)
	committerRe = regexp.MustCompile(`\bcommitter\(([^)]+)\)`)

	// committed-by-me
	committedByMeRe = regexp.MustCompile(`\bcommitted-by-me\b`)

	// path(glob)
	pathRe = regexp.MustCompile(`\bpath\(([^)]+)\)`)

	// message(text)
	messageRe = regexp.MustCompile(`\bmessage\(([^)]+)\)`)

	// order-by-(date|author-date|topo)
	orderRe = regexp.MustCompile(`\border-by-(date|author-date|topo)\b`)

	// ~fuzzy text~
	fuzzyRe = regexp.MustCompile(`~([^~]+)~`)
)

// ParseCommitQuery parses a OneDev-style commit query string into a
// CommitQuery struct. Returns an empty query (not nil) for an empty input.
//
// Examples:
//
//	"until branch(main) author(robin)"
//	"after(3 days ago) path(src/*.go) order-by-date"
//	"default-branch authored-by-me ~fix bug~"
func ParseCommitQuery(query string) (*CommitQuery, error) {
	if strings.TrimSpace(query) == "" {
		return &CommitQuery{}, nil
	}

	q := &CommitQuery{}

	// Parse revision criteria: until/since branch/tag/commit(value)
	for _, m := range revisionRe.FindAllStringSubmatch(query, -1) {
		// m[1] = until/since, m[2] = branch/tag/commit, m[3] = value
		q.Revisions = append(q.Revisions, RevisionCriteria{
			Type:    RevisionType(m[2]),
			Value:   strings.TrimSpace(m[3]),
			Exclude: strings.EqualFold(m[1], "since"),
		})
	}

	// default-branch
	if defaultBranchRe.MatchString(query) {
		q.DefaultBranch = true
	}

	// before(date)
	if m := beforeRe.FindStringSubmatch(query); m != nil {
		q.Before = strings.TrimSpace(m[1])
	}

	// after(date)
	if m := afterRe.FindStringSubmatch(query); m != nil {
		q.After = strings.TrimSpace(m[1])
	}

	// author(value)
	for _, m := range authorRe.FindAllStringSubmatch(query, -1) {
		q.Authors = append(q.Authors, strings.TrimSpace(m[1]))
	}

	// authored-by-me
	if authoredByMeRe.MatchString(query) {
		q.ByMe |= ByMeAuthor
	}

	// committer(value)
	for _, m := range committerRe.FindAllStringSubmatch(query, -1) {
		q.Committers = append(q.Committers, strings.TrimSpace(m[1]))
	}

	// committed-by-me
	if committedByMeRe.MatchString(query) {
		q.ByMe |= ByMeCommitter
	}

	// path(value)
	for _, m := range pathRe.FindAllStringSubmatch(query, -1) {
		q.Paths = append(q.Paths, strings.TrimSpace(m[1]))
	}

	// message(value)
	for _, m := range messageRe.FindAllStringSubmatch(query, -1) {
		q.Messages = append(q.Messages, strings.TrimSpace(m[1]))
	}

	// order-by-(date|author-date|topo)
	if m := orderRe.FindStringSubmatch(query); m != nil {
		q.Order = OrderType(m[1])
	}

	// ~fuzzy text~
	if m := fuzzyRe.FindStringSubmatch(query); m != nil {
		q.Fuzzy = strings.TrimSpace(m[1])
	}

	return q, nil
}

// ---------------------------------------------------------------------------
// Query execution — apply criteria to go-git log iteration.
// ---------------------------------------------------------------------------

// logOrder maps OrderType to go-git LogOrder.
func (q *CommitQuery) logOrder() gogit.LogOrder {
	switch q.Order {
	case OrderDate, OrderAuthorDate:
		// go-git does not have a distinct author-date order; committer time is
		// the closest approximation for both.
		return gogit.LogOrderCommitterTime
	case OrderTopo:
		return gogit.LogOrderDefault
	default:
		return gogit.LogOrderDefault
	}
}

// hasPathFilter returns true when at least one path criterion is set and a
// PathFilter should be applied at the go-git level.
func (q *CommitQuery) hasPathFilter() bool {
	return len(q.Paths) > 0
}

// pathFilter returns a function that matches when a changed path matches at
// least one of the query's path globs (simple wildcard support).
func (q *CommitQuery) pathFilter() func(string) bool {
	patterns := make([]string, len(q.Paths))
	copy(patterns, q.Paths)
	return func(p string) bool {
		for _, pat := range patterns {
			if matchCommitQueryGlob(pat, p) {
				return true
			}
		}
		return false
	}
}

// matchCommitQueryGlob implements basic glob matching (* matches any sequence, ?
// matches any single char). Falls back to substring match for simple patterns.
func matchCommitQueryGlob(pattern, value string) bool {
	if pattern == "" {
		return false
	}
	if !strings.Contains(pattern, "*") && !strings.Contains(pattern, "?") {
		// Plain substring match (OneDev path criteria does substring matching).
		return strings.Contains(value, pattern)
	}
	// Convert glob to regexp for proper wildcard matching.
	expr := "^"
	for _, ch := range pattern {
		switch ch {
		case '*':
			expr += ".*"
		case '?':
			expr += "."
		case '.', '+', '(', ')', '|', '^', '$', '{', '}', '[', ']', '\\':
			expr += "\\" + string(ch)
		default:
			expr += string(ch)
		}
	}
	expr += "$"
	matched, err := regexp.MatchString(expr, value)
	return err == nil && matched
}

// parseRelaxedDate parses a human-readable date string into a time.Time.
// Supports ISO 8601 dates, "yesterday", "N days/hours/minutes ago".
func parseRelaxedDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}

	// Try ISO / RFC formats first.
	formats := []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02 15:04:05",
		"2006/01/02",
		"2006/01/02 15:04:05",
		time.DateOnly,
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t, nil
		}
	}

	now := time.Now()

	// "yesterday"
	if strings.EqualFold(s, "yesterday") {
		return now.AddDate(0, 0, -1), nil
	}

	// "N days ago", "N hours ago", "N minutes ago", "N weeks ago", "N months ago"
	re := regexp.MustCompile(`(?i)^(\d+)\s+(day|hour|minute|week|month|year)s?\s+ago$`)
	if m := re.FindStringSubmatch(s); m != nil {
		n, err := strconv.Atoi(m[1])
		if err != nil {
			return time.Time{}, err
		}
		unit := strings.ToLower(m[2])
		switch unit {
		case "minute":
			return now.Add(-time.Duration(n) * time.Minute), nil
		case "hour":
			return now.Add(-time.Duration(n) * time.Hour), nil
		case "day":
			return now.AddDate(0, 0, -n), nil
		case "week":
			return now.AddDate(0, 0, -n*7), nil
		case "month":
			return now.AddDate(0, -n, 0), nil
		case "year":
			return now.AddDate(-n, 0, 0), nil
		}
	}

	return time.Time{}, fmt.Errorf("cannot parse date: %q", s)
}

// matchesPath returns true when at least one path in the commit's changed files
// matches at least one path criterion.
func (q *CommitQuery) matchesPath(commit *object.Commit) bool {
	if len(q.Paths) == 0 {
		return true
	}
	// Get changed paths for this commit by comparing with first parent.
	parentIter := commit.Parents()
	defer parentIter.Close()
	parent, _ := parentIter.Next()

	if parent == nil {
		// Root commit — get all files from the tree.
		tree, err := commit.Tree()
		if err != nil {
			return false
		}
		for _, e := range tree.Entries {
			if q.pathFilter()(e.Name) {
				return true
			}
		}
		return false
	}

	patch, err := commit.Patch(parent)
	if err != nil {
		return false
	}
	for _, fp := range patch.FilePatches() {
		_, to := fp.Files()
		if to != nil && q.pathFilter()(to.Path()) {
			return true
		}
		if from, _ := fp.Files(); from != nil && q.pathFilter()(from.Path()) {
			return true
		}
	}
	return false
}

// matchesAuthor returns true when the author matches the query criteria.
func (q *CommitQuery) matchesAuthor(commit *object.Commit, currentUserIdentity *currentUserInfo) bool {
	if len(q.Authors) == 0 && q.ByMe&ByMeAuthor == 0 {
		return true
	}
	authorName := strings.ToLower(commit.Author.Name)
	authorEmail := strings.ToLower(commit.Author.Email)

	// Check "authored-by-me"
	if q.ByMe&ByMeAuthor != 0 && currentUserIdentity != nil {
		if currentUserIdentity.matches(authorName, authorEmail) {
			return true
		}
	}

	// Check author list
	for _, a := range q.Authors {
		pattern := strings.ToLower(a)
		if strings.Contains(pattern, "*") {
			if matchCommitQueryGlob(a, commit.Author.Name) || matchCommitQueryGlob(a, commit.Author.Email) {
				return true
			}
		} else {
			if strings.Contains(authorName, pattern) || strings.Contains(authorEmail, pattern) {
				return true
			}
		}
	}
	if len(q.Authors) > 0 {
		return false
	}
	if q.ByMe&ByMeAuthor != 0 {
		return false // authored-by-me was set but didn't match
	}
	return true
}

// matchesCommitter returns true when the committer matches the query criteria.
func (q *CommitQuery) matchesCommitter(commit *object.Commit, currentUserIdentity *currentUserInfo) bool {
	if len(q.Committers) == 0 && q.ByMe&ByMeCommitter == 0 {
		return true
	}
	committerName := strings.ToLower(commit.Committer.Name)
	committerEmail := strings.ToLower(commit.Committer.Email)

	// Check "committed-by-me"
	if q.ByMe&ByMeCommitter != 0 && currentUserIdentity != nil {
		if currentUserIdentity.matches(committerName, committerEmail) {
			return true
		}
	}

	// Check committer list
	for _, c := range q.Committers {
		pattern := strings.ToLower(c)
		if strings.Contains(pattern, "*") {
			if matchCommitQueryGlob(c, commit.Committer.Name) || matchCommitQueryGlob(c, commit.Committer.Email) {
				return true
			}
		} else {
			if strings.Contains(committerName, pattern) || strings.Contains(committerEmail, pattern) {
				return true
			}
		}
	}
	if len(q.Committers) > 0 {
		return false
	}
	if q.ByMe&ByMeCommitter != 0 {
		return false // committed-by-me was set but didn't match
	}
	return true
}

// matchesDateRange returns true when the commit date falls within the
// before/after constraints.
func (q *CommitQuery) matchesDateRange(commit *object.Commit) bool {
	commitTime := commit.Committer.When
	if commitTime.IsZero() {
		commitTime = commit.Author.When
	}

	if q.After != "" {
		afterTime, err := parseRelaxedDate(q.After)
		if err != nil {
			return false // if we can't parse the date, exclude
		}
		if commitTime.Before(afterTime) {
			return false
		}
	}

	if q.Before != "" {
		beforeTime, err := parseRelaxedDate(q.Before)
		if err != nil {
			return false
		}
		if commitTime.After(beforeTime) {
			return false
		}
	}

	return true
}

// matchesMessage returns true when the commit message matches at least one
// message criterion.
func (q *CommitQuery) matchesMessage(commit *object.Commit) bool {
	if len(q.Messages) == 0 {
		return true
	}
	msg := strings.ToLower(commit.Message)
	for _, m := range q.Messages {
		if strings.Contains(msg, strings.ToLower(m)) {
			return true
		}
	}
	return false
}

// matchesFuzzy returns true when the fuzzy text matches the commit hash,
// subject, or message.
func (q *CommitQuery) matchesFuzzy(commit *object.Commit) bool {
	if q.Fuzzy == "" {
		return true
	}
	fuzzy := strings.ToLower(q.Fuzzy)
	haystacks := []string{
		strings.ToLower(commit.Hash.String()),
		strings.ToLower(commit.Message),
	}
	for _, h := range haystacks {
		if strings.Contains(h, fuzzy) {
			return true
		}
	}
	return false
}

// currentUserInfo carries the identity information needed to evaluate
// "authored-by-me" and "committed-by-me" criteria.
type currentUserInfo struct {
	name  string
	email string
}

// matches checks whether the given name or email matches this user identity.
func (u *currentUserInfo) matches(name, email string) bool {
	if u == nil {
		return false
	}
	n := strings.ToLower(u.name)
	e := strings.ToLower(u.email)
	return strings.EqualFold(name, n) || strings.EqualFold(email, e) ||
		strings.Contains(name, n) || strings.Contains(email, e)
}

// userIdentities builds identity lookup structs for "by-me" evaluation.
func userIdentities(userName, userEmail string) *currentUserInfo {
	if userName == "" && userEmail == "" {
		return nil
	}
	return &currentUserInfo{name: userName, email: userEmail}
}

// ApplyFilter iterates commits from iter and returns up to count commits that
// match all query criteria. Path filtering is NOT done here — it should be set
// on LogOptions via PathFilter for efficiency. This function handles
// post-filtering for author, committer, date range, message, and fuzzy.
//
// If currentUserName/Email are non-empty, "by-me" criteria are evaluated
// against them.
func (q *CommitQuery) ApplyFilter(
	iter object.CommitIter,
	count int,
	currentUserName, currentUserEmail string,
) ([]Commit, error) {
	if q.IsEmpty() {
		// Fast path: no filtering needed.
		return collectCommits(iter, count)
	}

	identity := userIdentities(currentUserName, currentUserEmail)
	commits := make([]Commit, 0, count)
	defer iter.Close()

	for len(commits) < count {
		obj, err := iter.Next()
		if err != nil {
			break // end of iteration
		}

		if !q.matchesAuthor(obj, identity) {
			continue
		}
		if !q.matchesCommitter(obj, identity) {
			continue
		}
		if !q.matchesDateRange(obj) {
			continue
		}
		if !q.matchesMessage(obj) {
			continue
		}
		if !q.matchesFuzzy(obj) {
			continue
		}
		// Path filtering: if paths are specified, must match at least one.
		// Note: this is a fallback — ideally PathFilter is set on LogOptions.
		if len(q.Paths) > 0 && !q.matchesPath(obj) {
			continue
		}

		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}

// collectCommits collects up to count commits from an iterator without any
// filtering.
func collectCommits(iter object.CommitIter, count int) ([]Commit, error) {
	defer iter.Close()
	commits := make([]Commit, 0, count)
	for len(commits) < count {
		obj, err := iter.Next()
		if err != nil {
			break
		}
		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}

// resolveRevision resolves a branch/tag name or commit hash to a plumbing.Hash.
func (r *Repository) resolveRevision(ref string) (*plumbing.Hash, error) {
	if ref == "" {
		def := r.DefaultRevision()
		if def == "" {
			return nil, fmt.Errorf("no default revision")
		}
		ref = def
	}
	hash, err := r.inner.ResolveRevision(plumbing.Revision(ref))
	if err != nil {
		return nil, fmt.Errorf("resolve revision %q: %w", ref, err)
	}
	return hash, nil
}

// resolveRevisionCriteria resolves a revision criterion to a plumbing.Hash.
func (r *Repository) resolveRevisionCriteria(rev RevisionCriteria) (*plumbing.Hash, error) {
	switch rev.Type {
	case RevisionBranch:
		if rev.Value == "" {
			def := r.DefaultRevision()
			if def == "" {
				return nil, fmt.Errorf("no default branch")
			}
			return r.resolveRevision(def)
		}
		return r.resolveRevision(rev.Value)
	case RevisionTag:
		return r.resolveRevision("refs/tags/" + rev.Value)
	case RevisionCommit:
		return r.resolveRevision(rev.Value)
	default:
		return nil, fmt.Errorf("unknown revision type: %s", rev.Type)
	}
}

// revisionRef returns a git rev-list ref string for a revision criterion.
func (r *Repository) revisionRef(rev RevisionCriteria) (string, error) {
	hash, err := r.resolveRevisionCriteria(rev)
	if err != nil {
		return "", err
	}
	return hash.String(), nil
}

// revListHashes runs `git rev-list` with multiple heads and optional exclusions.
func (r *Repository) revListHashes(
	heads []string,
	excludes []string,
	order OrderType,
	count int,
) ([]plumbing.Hash, error) {
	if len(heads) == 0 {
		return nil, fmt.Errorf("no revision heads")
	}
	if count <= 0 {
		count = 100
	}

	args := []string{"-C", r.path, "rev-list"}
	switch order {
	case OrderDate, OrderAuthorDate:
		args = append(args, "--date-order")
	case OrderTopo:
		args = append(args, "--topo-order")
	default:
		args = append(args, "--topo-order")
	}
	args = append(args, fmt.Sprintf("-n%d", count))
	args = append(args, heads...)
	for _, ex := range excludes {
		args = append(args, "^"+ex)
	}

	out, err := exec.Command("git", args...).Output()
	if err != nil {
		return nil, fmt.Errorf("git rev-list: %w", err)
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	hashes := make([]plumbing.Hash, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		hashes = append(hashes, plumbing.NewHash(line))
	}
	return hashes, nil
}

func collectFilteredCommitsFromHashes(
	r *Repository,
	hashes []plumbing.Hash,
	query *CommitQuery,
	count int,
	currentUserName, currentUserEmail string,
) ([]Commit, error) {
	identity := userIdentities(currentUserName, currentUserEmail)
	commits := make([]Commit, 0, count)

	for _, hash := range hashes {
		if len(commits) >= count {
			break
		}
		obj, err := r.inner.CommitObject(hash)
		if err != nil {
			continue
		}
		if query != nil {
			if !query.matchesAuthor(obj, identity) {
				continue
			}
			if !query.matchesCommitter(obj, identity) {
				continue
			}
			if !query.matchesDateRange(obj) {
				continue
			}
			if !query.matchesMessage(obj) {
				continue
			}
			if !query.matchesFuzzy(obj) {
				continue
			}
			if len(query.Paths) > 0 && !query.matchesPath(obj) {
				continue
			}
		}
		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}

// ---------------------------------------------------------------------------
// ListCommitsQuery — the full query-driven commit listing.
// ---------------------------------------------------------------------------

// ListCommitsQuery returns up to count commits reachable from the given
// revision (or default branch when empty), filtered by the query's criteria.
//
// When query is nil or empty, behaves identically to ListCommits.
func (r *Repository) ListCommitsQuery(
	revision string,
	query *CommitQuery,
	count int,
	currentUserName, currentUserEmail string,
) ([]Commit, error) {
	if !r.HasRefs() {
		return []Commit{}, nil
	}

	// Determine the starting revision.
	effectiveRevision := revision
	if query != nil && len(query.Revisions) > 0 {
		// Use the first "until" revision as the starting point.
		for _, rev := range query.Revisions {
			if !rev.Exclude {
				effectiveRevision = rev.Value
				break
			}
		}
	}
	if effectiveRevision == "" {
		if query != nil && query.DefaultBranch {
			effectiveRevision = r.DefaultRevision()
		} else {
			effectiveRevision = r.DefaultRevision()
		}
	}
	if effectiveRevision == "" {
		return []Commit{}, nil
	}

	if count <= 0 {
		count = 100
	}

	order := OrderType("")
	if query != nil {
		order = query.Order
	}

	var untilRevs []RevisionCriteria
	var sinceRevs []RevisionCriteria
	if query != nil {
		for _, rev := range query.Revisions {
			if rev.Exclude {
				sinceRevs = append(sinceRevs, rev)
			} else {
				untilRevs = append(untilRevs, rev)
			}
		}
	}

	// Multiple until revisions: union reachable commits via git rev-list.
	if len(untilRevs) > 1 {
		heads := make([]string, 0, len(untilRevs))
		for _, rev := range untilRevs {
			ref, err := r.revisionRef(rev)
			if err != nil {
				return nil, err
			}
			heads = append(heads, ref)
		}
		excludes := make([]string, 0, len(sinceRevs))
		for _, rev := range sinceRevs {
			ref, err := r.revisionRef(rev)
			if err != nil {
				continue
			}
			excludes = append(excludes, ref)
		}
		hashes, err := r.revListHashes(heads, excludes, order, count*5)
		if err != nil {
			return nil, err
		}
		return collectFilteredCommitsFromHashes(r, hashes, query, count, currentUserName, currentUserEmail)
	}

	hash, err := r.resolveRevision(effectiveRevision)
	if err != nil {
		return nil, err
	}

	// Build LogOptions with order and path filter from the query.
	logOpts := &gogit.LogOptions{From: *hash}
	if query != nil {
		logOpts.Order = query.logOrder()
		if query.hasPathFilter() {
			// Prefer PathFilter at the go-git level for efficiency.
			logOpts.PathFilter = query.pathFilter()
		}
	}

	iter, err := r.inner.Log(logOpts)
	if err != nil {
		return nil, err
	}

	if query == nil || query.IsEmpty() {
		return collectCommits(iter, count)
	}

	// Build the set of "since" exclusion hashes.
	excludeHashes := make(map[string]bool)
	if query != nil {
		for _, rev := range query.Revisions {
			if rev.Exclude {
				exHash, err := r.resolveRevisionCriteria(rev)
				if err == nil {
					excludeHashes[exHash.String()] = true
				}
			}
		}
	}

	// Check if IterateCommits gives us ancestor information for "since" exclusion.
	// Simple approach: iterate and stop at excluded hashes.

	// If we have "since" exclusions, we need to stop iteration when we reach
	// the excluded commits. Otherwise post-filtering by identity/date/message.
	identity := userIdentities(currentUserName, currentUserEmail)
	commits := make([]Commit, 0, count)
	defer iter.Close()

	for len(commits) < count {
		obj, err := iter.Next()
		if err != nil {
			break
		}

		// Stop at excluded ("since") commits.
		if excludeHashes[obj.Hash.String()] {
			break
		}

		if !query.matchesAuthor(obj, identity) {
			continue
		}
		if !query.matchesCommitter(obj, identity) {
			continue
		}
		if !query.matchesDateRange(obj) {
			continue
		}
		if !query.matchesMessage(obj) {
			continue
		}
		if !query.matchesFuzzy(obj) {
			continue
		}

		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}
