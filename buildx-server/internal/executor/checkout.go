package executor

import (
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
)

func checkoutCommit(repoPath, workDir, commitHash string, withLFS, withSubmodules bool, depth int, logger TaskLogger) error {
	opts := git.CheckoutOptions{
		WithLFS:        withLFS,
		WithSubmodules: withSubmodules,
		CloneDepth:     depth,
	}
	if logger != nil {
		opts.LogLine = func(line string, stderr bool) {
			if stderr {
				logger.Stderr(line)
			} else {
				logger.Stdout(line)
			}
		}
	}
	return git.CheckoutCommit(repoPath, workDir, commitHash, opts)
}
