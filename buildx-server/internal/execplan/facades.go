package execplan

import "github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"

// CommandFacade runs shell commands on the build agent or server shell executor.
type CommandFacade struct {
	Name        string
	Commands    string
	Image       string
	Interpreter string
	EnvVars     map[string]string
	UseTTY      bool
}

func (*CommandFacade) isFacade()     {}
func (*CommandFacade) isLeafFacade() {}

// CheckoutFacade checks out source into the job work directory.
type CheckoutFacade struct {
	Name           string
	WithLFS        bool
	WithSubmodules bool
	CloneDepth     int
}

func (*CheckoutFacade) isFacade()     {}
func (*CheckoutFacade) isLeafFacade() {}

// ServerSideFacade represents steps executed via JobService.runServerStep.
type ServerSideFacade struct {
	Name string
	Step buildspec.Step
}

func (*ServerSideFacade) isFacade()     {}
func (*ServerSideFacade) isLeafFacade() {}

// SetupCacheFacade restores/saves job cache via RunCacheService.
type SetupCacheFacade struct {
	Name           string
	Key            string
	ChecksumFiles  string
	Paths          []string
	UploadStrategy string
}

func (*SetupCacheFacade) isFacade()     {}
func (*SetupCacheFacade) isLeafFacade() {}

// RunContainerFacade runs commands inside a container (Docker/K8s executors).
type RunContainerFacade struct {
	Name     string
	Image    string
	Commands string
	EnvVars  map[string]string
}

func (*RunContainerFacade) isFacade()     {}
func (*RunContainerFacade) isLeafFacade() {}

// BuildImageFacade builds a container image via docker build.
type BuildImageFacade struct {
	Name        string
	Dockerfile  string
	ContextPath string
	Tags        []string
	BuildArgs   map[string]string
}

func (*BuildImageFacade) isFacade()     {}
func (*BuildImageFacade) isLeafFacade() {}

// PullImageFacade pulls container images.
type PullImageFacade struct {
	Name      string
	ImageTags []string
}

func (*PullImageFacade) isFacade()     {}
func (*PullImageFacade) isLeafFacade() {}

// PushImageFacade pushes container images.
type PushImageFacade struct {
	Name      string
	ImageTags []string
}

func (*PushImageFacade) isFacade()     {}
func (*PushImageFacade) isLeafFacade() {}
