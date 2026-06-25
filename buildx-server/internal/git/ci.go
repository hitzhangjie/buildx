package git

import "context"

// CIService implements job.GitService using go-git repository operations.
type CIService struct{}

// ResolveRef resolves a branch or tag name to a commit hash.
func (CIService) ResolveRef(_ context.Context, repoPath, ref string) (string, error) {
	repo, err := Open(repoPath)
	if err != nil {
		return "", err
	}
	return repo.ResolveCommitHash(ref)
}

// ReadFileAtCommit reads file contents at a specific commit.
func (CIService) ReadFileAtCommit(_ context.Context, repoPath, commitHash, filePath string) ([]byte, error) {
	repo, err := Open(repoPath)
	if err != nil {
		return nil, err
	}
	data, _, err := repo.ReadFileBytes(commitHash, filePath)
	return data, err
}
