package executor

import (
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
)

func checkoutCommit(repoPath, workDir, commitHash string, withLFS, withSubmodules bool, depth int) error {
	return git.CheckoutCommit(repoPath, workDir, commitHash, git.CheckoutOptions{
		WithLFS:        withLFS,
		WithSubmodules: withSubmodules,
		CloneDepth:     depth,
	})
}
