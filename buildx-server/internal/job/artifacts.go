package job

import (
	"context"
	"path/filepath"
)

// PublishArtifacts implements executor.ArtifactPublisher for server-side publish steps.
func (s *Service) PublishArtifacts(ctx context.Context, projectID int64, buildNumber int, workDir, sourcePath, patterns string) error {
	if s.artifacts == nil {
		return nil
	}
	return s.artifacts.Publish(projectID, buildNumber, workDir, sourcePath, patterns)
}

func (s *Service) copyDependencyArtifacts(ctx context.Context, buildID int64, workDir string) {
	if s.artifacts == nil {
		return
	}
	deps, err := s.buildStore.ListDependencies(ctx, buildID)
	if err != nil {
		return
	}
	for _, dep := range deps {
		if dep.DependencyID == 0 || dep.Artifacts == "" {
			continue
		}
		depBuild, err := s.buildStore.Get(ctx, dep.DependencyID)
		if err != nil {
			continue
		}
		dest := workDir
		if dep.DestinationPath != "" {
			dest = filepath.Join(workDir, dep.DestinationPath)
		}
		_ = s.artifacts.CopyTo(depBuild.ProjectID, depBuild.Number, dep.Artifacts, dest)
	}
}
