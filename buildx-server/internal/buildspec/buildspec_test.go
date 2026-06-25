package buildspec

import (
	"testing"

	"gopkg.in/yaml.v3"
)

func TestParseFullBuildSpec(t *testing.T) {
	yamlData := `
jobs:
  - name: build
    jobExecutor: k8s
    timeout: 7200
    steps:
      - type: checkout
        name: Checkout code
        withLfs: true
        cloneDepth: 50
      - type: command
        name: Build
        image: golang:1.25
        commands: |
          go build ./...
          go test ./...
        envVars:
          GOPROXY: "https://proxy.golang.org"
      - type: setup-cache
        name: Cache modules
        key: go-mod-{{ hashFiles('**/go.sum') }}
        paths:
          - /root/go/pkg/mod
      - type: publish-artifact
        name: Publish binary
        artifacts: "bin/*"
        targetPath: artifacts/
    triggers:
      - type: branch-update
        branches: main
      - type: tag-create
        tags: v*
    postBuildActions:
      - type: create-issue
        titleTemplate: Build failed for {{ job.name }}
        bodyTemplate: See build {{ build.number }}
      - type: send-notification
        receivers:
          - dev-team@example.com
        template: build-complete
    jobDependencies:
      - jobName: test
        requireSuccessful: true
        artifacts: "reports/*"
    requiredServices:
      - redis
    retryCondition: never
    maxRetries: 3
    retryDelay: 30
services:
  - name: redis
    image: redis:7-alpine
    ports:
      - 6379
properties:
  - name: key1
    value: val1
stepTemplates:
  - name: checkout
    steps:
      - type: checkout
        name: Checkout
`
	spec, err := Parse([]byte(yamlData))
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	// Verify parsed spec
	if len(spec.Jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(spec.Jobs))
	}
	job := spec.Jobs[0]
	if job.Name != "build" {
		t.Errorf("expected job name 'build', got %q", job.Name)
	}
	if job.JobExecutor != "k8s" {
		t.Errorf("expected jobExecutor 'k8s', got %q", job.JobExecutor)
	}
	if job.Timeout != 7200 {
		t.Errorf("expected timeout 7200, got %d", job.Timeout)
	}

	// Verify steps
	if len(job.Steps) != 4 {
		t.Fatalf("expected 4 steps, got %d", len(job.Steps))
	}

	_, ok := job.Steps[0].(*CheckoutStep)
	if !ok {
		t.Fatalf("expected step[0] to be *CheckoutStep, got %T", job.Steps[0])
	}
	checkout := job.Steps[0].(*CheckoutStep)
	if checkout.Name != "Checkout code" {
		t.Errorf("expected step[0] name 'Checkout code', got %q", checkout.Name)
	}
	if !checkout.WithLFS {
		t.Error("expected step[0] WithLFS to be true")
	}
	if checkout.CloneDepth != 50 {
		t.Errorf("expected step[0] CloneDepth 50, got %d", checkout.CloneDepth)
	}

	_, ok = job.Steps[1].(*CommandStep)
	if !ok {
		t.Fatalf("expected step[1] to be *CommandStep, got %T", job.Steps[1])
	}
	cmd := job.Steps[1].(*CommandStep)
	if cmd.Name != "Build" {
		t.Errorf("expected step[1] name 'Build', got %q", cmd.Name)
	}
	if cmd.Image != "golang:1.25" {
		t.Errorf("expected step[1] image 'golang:1.25', got %q", cmd.Image)
	}
	if cmd.EnvVars == nil || cmd.EnvVars["GOPROXY"] != "https://proxy.golang.org" {
		t.Errorf("expected step[1] envVar GOPROXY, got %v", cmd.EnvVars)
	}

	_, ok = job.Steps[2].(*SetupCacheStep)
	if !ok {
		t.Fatalf("expected step[2] to be *SetupCacheStep, got %T", job.Steps[2])
	}
	cache := job.Steps[2].(*SetupCacheStep)
	if len(cache.Paths) != 1 || cache.Paths[0] != "/root/go/pkg/mod" {
		t.Errorf("expected cache path '/root/go/pkg/mod', got %v", cache.Paths)
	}

	_, ok = job.Steps[3].(*PublishArtifactStep)
	if !ok {
		t.Fatalf("expected step[3] to be *PublishArtifactStep, got %T", job.Steps[3])
	}

	// Verify triggers
	if len(job.Triggers) != 2 {
		t.Fatalf("expected 2 triggers, got %d", len(job.Triggers))
	}
	_, ok = job.Triggers[0].(*BranchUpdateTrigger)
	if !ok {
		t.Fatalf("expected trigger[0] to be *BranchUpdateTrigger, got %T", job.Triggers[0])
	}
	_, ok = job.Triggers[1].(*TagCreateTrigger)
	if !ok {
		t.Fatalf("expected trigger[1] to be *TagCreateTrigger, got %T", job.Triggers[1])
	}

	// Verify post-build actions
	if len(job.PostBuildActions) != 2 {
		t.Fatalf("expected 2 postBuildActions, got %d", len(job.PostBuildActions))
	}
	_, ok = job.PostBuildActions[0].(*CreateIssueAction)
	if !ok {
		t.Fatalf("expected action[0] to be *CreateIssueAction, got %T", job.PostBuildActions[0])
	}
	_, ok = job.PostBuildActions[1].(*SendNotificationAction)
	if !ok {
		t.Fatalf("expected action[1] to be *SendNotificationAction, got %T", job.PostBuildActions[1])
	}

	// Verify services
	if len(spec.Services) != 1 {
		t.Fatalf("expected 1 service, got %d", len(spec.Services))
	}
	if spec.Services[0].Name != "redis" {
		t.Errorf("expected service name 'redis', got %q", spec.Services[0].Name)
	}

	// Verify properties
	if len(spec.Properties) != 1 {
		t.Fatalf("expected 1 property, got %d", len(spec.Properties))
	}

	// Verify step templates
	if len(spec.StepTemplates) != 1 {
		t.Fatalf("expected 1 step template, got %d", len(spec.StepTemplates))
	}
	if spec.StepTemplates[0].Name != "checkout" {
		t.Errorf("expected template name 'checkout', got %q", spec.StepTemplates[0].Name)
	}

	// Verify YAML round-trip (marshal back and ensure it parses again)
	reEncoded, err := yaml.Marshal(spec)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	spec2, err := Parse(reEncoded)
	if err != nil {
		t.Fatalf("parse of re-encoded spec failed: %v\n%s", err, string(reEncoded))
	}
	if len(spec2.Jobs) != 1 {
		t.Fatalf("round-trip: expected 1 job, got %d", len(spec2.Jobs))
	}
}

func TestCommandStep(t *testing.T) {
	yamlData := `
type: command
name: Test Command
image: ubuntu:22.04
interpreter: posix
runAs: "1000:1000"
useTTY: true
commands: |
  echo hello
  echo world
envVars:
  MY_VAR: my_value
registryLogins:
  - registryUrl: https://registry.example.com
    userName: user1
    passwordSecret: my-secret
`
	var step CommandStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal CommandStep failed: %v", err)
	}
	if step.Name != "Test Command" {
		t.Errorf("expected name 'Test Command', got %q", step.Name)
	}
	if step.Image != "ubuntu:22.04" {
		t.Errorf("expected image 'ubuntu:22.04', got %q", step.Image)
	}
	if step.Commands != "echo hello\necho world\n" {
		t.Errorf("expected specific commands, got %q", step.Commands)
	}
	if step.RunAs != "1000:1000" {
		t.Errorf("expected runAs '1000:1000', got %q", step.RunAs)
	}
	if !step.UseTTY {
		t.Error("expected useTTY true")
	}
	if len(step.RegistryLogins) != 1 {
		t.Fatalf("expected 1 registry login, got %d", len(step.RegistryLogins))
	}
	if step.RegistryLogins[0].RegistryURL != "https://registry.example.com" {
		t.Errorf("expected registry URL, got %q", step.RegistryLogins[0].RegistryURL)
	}
	if step.EnvVars["MY_VAR"] != "my_value" {
		t.Errorf("expected env var MY_VAR=my_value, got %q", step.EnvVars["MY_VAR"])
	}
}

func TestCheckoutStep(t *testing.T) {
	yamlData := `
type: checkout
name: Checkout
withLfs: true
withSubmodules: false
cloneDepth: 10
`
	var step CheckoutStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal CheckoutStep failed: %v", err)
	}
	if !step.WithLFS {
		t.Error("expected WithLFS true")
	}
	if step.CloneDepth != 10 {
		t.Errorf("expected cloneDepth 10, got %d", step.CloneDepth)
	}
}

func TestSetupCacheStep(t *testing.T) {
	yamlData := `
type: setup-cache
name: Cache Go modules
key: go-mod-{{ checksum "go.sum" }}
paths:
  - /root/.cache/go
  - /root/go/pkg/mod
`
	var step SetupCacheStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal SetupCacheStep failed: %v", err)
	}
	if step.Key != `go-mod-{{ checksum "go.sum" }}` {
		t.Errorf("expected key, got %q", step.Key)
	}
	if len(step.Paths) != 2 {
		t.Fatalf("expected 2 paths, got %d", len(step.Paths))
	}
}

func TestPublishReportStep(t *testing.T) {
	yamlData := `
type: publish-report
name: Test Report
reportName: Unit Tests
reportType: junit
path: "reports/*.xml"
`
	var step PublishReportStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal PublishReportStep failed: %v", err)
	}
	if step.ReportType != "junit" {
		t.Errorf("expected reportType 'junit', got %q", step.ReportType)
	}
}

func TestBuildImageStep(t *testing.T) {
	yamlData := `
type: build-image
name: Build Docker Image
dockerfile: Dockerfile
contextPath: .
tags:
  - myapp:latest
  - myapp:1.0.0
buildArgs:
  VERSION: "1.0.0"
`
	var step BuildImageStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal BuildImageStep failed: %v", err)
	}
	if len(step.Tags) != 2 {
		t.Fatalf("expected 2 tags, got %d", len(step.Tags))
	}
	if step.BuildArgs["VERSION"] != "1.0.0" {
		t.Errorf("expected build arg VERSION=1.0.0, got %q", step.BuildArgs["VERSION"])
	}
}

func TestUseTemplateStep(t *testing.T) {
	yamlData := `
type: use-template
name: Use My Template
templateName: my-template
paramMatrix:
  - name: version
    values:
      - "1.0"
      - "2.0"
`
	var step UseTemplateStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal UseTemplateStep failed: %v", err)
	}
	if step.TemplateName != "my-template" {
		t.Errorf("expected templateName 'my-template', got %q", step.TemplateName)
	}
	if len(step.ParamMatrix) != 1 {
		t.Fatalf("expected 1 param matrix entry, got %d", len(step.ParamMatrix))
	}
}

func TestTriggers(t *testing.T) {
	yamlData := `
- type: branch-update
  branches: main
- type: tag-create
  tags: v*
- type: pull-request
  branches: main
- type: schedule
  cronExpression: 0 0 * * *
- type: dependency-finished
  jobNames:
    - build
    - test
`
	var triggers Triggers
	if err := yaml.Unmarshal([]byte(yamlData), &triggers); err != nil {
		t.Fatalf("unmarshal Triggers failed: %v", err)
	}
	if len(triggers) != 5 {
		t.Fatalf("expected 5 triggers, got %d", len(triggers))
	}
	if _, ok := triggers[4].(*DependencyFinishedTrigger); !ok {
		t.Fatalf("expected trigger[4] to be *DependencyFinishedTrigger, got %T", triggers[4])
	}
	dep := triggers[4].(*DependencyFinishedTrigger)
	if len(dep.JobNames) != 2 {
		t.Errorf("expected 2 job names, got %d", len(dep.JobNames))
	}
}

func TestParamSpecs(t *testing.T) {
	yamlData := `
- type: boolean
  name: debug
  defaultValue: false
- type: text
  name: message
  defaultValue: Hello
  multiline: true
- type: integer
  name: count
  defaultValue: 10
  minValue: 1
  maxValue: 100
- type: choice
  name: environment
  choices:
    - dev
    - staging
    - prod
  defaultValue: dev
- type: commit
  name: commitHash
`
	var params ParamSpecs
	if err := yaml.Unmarshal([]byte(yamlData), &params); err != nil {
		t.Fatalf("unmarshal ParamSpecs failed: %v", err)
	}
	if len(params) != 5 {
		t.Fatalf("expected 5 params, got %d", len(params))
	}

	// Validate types
	if params[0].ParamType() != ParamTypeBoolean {
		t.Errorf("expected param[0] type boolean, got %q", params[0].ParamType())
	}
	if params[1].ParamType() != ParamTypeText {
		t.Errorf("expected param[1] type text, got %q", params[1].ParamType())
	}
	if params[2].ParamType() != ParamTypeInteger {
		t.Errorf("expected param[2] type integer, got %q", params[2].ParamType())
	}

	// Validate integer param specifics
	intParam, ok := params[2].(*IntegerParam)
	if !ok {
		t.Fatalf("expected param[2] to be *IntegerParam, got %T", params[2])
	}
	if intParam.DefaultValue != 10 {
		t.Errorf("expected defaultValue 10, got %d", intParam.DefaultValue)
	}
	if *intParam.MinValue != 1 {
		t.Errorf("expected minValue 1, got %d", *intParam.MinValue)
	}

	// Validate choice param
	choiceParam, ok := params[3].(*ChoiceParam)
	if !ok {
		t.Fatalf("expected param[3] to be *ChoiceParam, got %T", params[3])
	}
	if len(choiceParam.Choices) != 3 {
		t.Errorf("expected 3 choices, got %d", len(choiceParam.Choices))
	}
}

func TestPostBuildActions(t *testing.T) {
	yamlData := `
- type: create-issue
  titleTemplate: Build failed - {{ job.name }}
  assigneeName: admin
- type: run-job
  jobName: deploy
  paramMatrix:
    - name: env
      values:
        - production
- type: send-notification
  receivers:
    - dev-team@example.com
  template: build-notification
`
	var actions PostBuildActions
	if err := yaml.Unmarshal([]byte(yamlData), &actions); err != nil {
		t.Fatalf("unmarshal PostBuildActions failed: %v", err)
	}
	if len(actions) != 3 {
		t.Fatalf("expected 3 actions, got %d", len(actions))
	}

	if _, ok := actions[0].(*CreateIssueAction); !ok {
		t.Fatalf("expected action[0] to be *CreateIssueAction, got %T", actions[0])
	}
	if _, ok := actions[1].(*RunJobAction); !ok {
		t.Fatalf("expected action[1] to be *RunJobAction, got %T", actions[1])
	}
	if _, ok := actions[2].(*SendNotificationAction); !ok {
		t.Fatalf("expected action[2] to be *SendNotificationAction, got %T", actions[2])
	}

	runJob := actions[1].(*RunJobAction)
	if runJob.JobName != "deploy" {
		t.Errorf("expected jobName 'deploy', got %q", runJob.JobName)
	}
}

func TestValidateDuplicateNames(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{Name: "build"},
			{Name: "build"},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for duplicate job names")
	}
}

func TestValidateUndefinedServiceRef(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{Name: "build", RequiredServices: []string{"nonexistent"}},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for undefined service reference")
	}
}

func TestValidateCircularDependency(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{
				Name: "job-a",
				JobDependencies: []*JobDependency{
					{JobName: "job-b"},
				},
			},
			{
				Name: "job-b",
				JobDependencies: []*JobDependency{
					{JobName: "job-a"},
				},
			},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for circular dependency")
	}
}

func TestValidateCircularTemplate(t *testing.T) {
	spec := &BuildSpec{
		StepTemplates: []*StepTemplate{
			{
				Name: "tmpl-a",
				Steps: Steps{
					&UseTemplateStep{TemplateName: "tmpl-b"},
				},
			},
			{
				Name: "tmpl-b",
				Steps: Steps{
					&UseTemplateStep{TemplateName: "tmpl-a"},
				},
			},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for circular template reference")
	}
}

func TestGetJobMap(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{Name: "build"},
			{Name: "test"},
		},
	}
	m := spec.GetJobMap()
	if len(m) != 2 {
		t.Fatalf("expected 2 entries in job map, got %d", len(m))
	}
	if _, ok := m["build"]; !ok {
		t.Error("expected 'build' in job map")
	}
}

func TestGetServiceMap(t *testing.T) {
	spec := &BuildSpec{
		Services: []*Service{
			{Name: "redis", Image: "redis:7"},
		},
	}
	m := spec.GetServiceMap()
	if len(m) != 1 {
		t.Fatalf("expected 1 entry in service map, got %d", len(m))
	}
}

func TestGetStepTemplateMap(t *testing.T) {
	spec := &BuildSpec{
		StepTemplates: []*StepTemplate{
			{Name: "checkout-template"},
		},
	}
	m := spec.GetStepTemplateMap()
	if len(m) != 1 {
		t.Fatalf("expected 1 entry in template map, got %d", len(m))
	}
}

func TestGetPropertyMap(t *testing.T) {
	spec := &BuildSpec{
		Properties: []*JobProperty{
			{Name: "key1", Value: "val1"},
		},
	}
	m := spec.GetPropertyMap()
	if len(m) != 1 {
		t.Fatalf("expected 1 entry in property map, got %d", len(m))
	}
	if m["key1"].Value != "val1" {
		t.Errorf("expected value 'val1', got %q", m["key1"].Value)
	}
}

func TestJobDefaults(t *testing.T) {
	job := &Job{Name: "test"}
	job.Defaults()
	if job.Timeout != DefaultTimeout {
		t.Errorf("expected default timeout %d, got %d", DefaultTimeout, job.Timeout)
	}
	if job.RetryCondition != DefaultRetryCondition {
		t.Errorf("expected default retry condition %q, got %q", DefaultRetryCondition, job.RetryCondition)
	}
	if job.MaxRetries != DefaultMaxRetries {
		t.Errorf("expected default max retries %d, got %d", DefaultMaxRetries, job.MaxRetries)
	}
}

func TestStepTypeEnum(t *testing.T) {
	tests := []struct {
		step Step
		typ  StepType
	}{
		{&CommandStep{}, StepTypeCommand},
		{&CheckoutStep{}, StepTypeCheckout},
		{&SetupCacheStep{}, StepTypeSetupCache},
		{&PublishArtifactStep{}, StepTypePublishArtifact},
		{&PublishReportStep{}, StepTypePublishReport},
		{&CreateBranchStep{}, StepTypeCreateBranch},
		{&CreateTagStep{}, StepTypeCreateTag},
		{&SetBuildVersionStep{}, StepTypeSetBuildVersion},
		{&CreatePullRequestStep{}, StepTypeCreatePullRequest},
		{&BuildImageStep{}, StepTypeBuildImage},
		{&PushImageStep{}, StepTypePushImage},
		{&RunContainerStep{}, StepTypeRunContainer},
		{&PullImageStep{}, StepTypePullImage},
		{&UseTemplateStep{}, StepTypeUseTemplate},
	}
	for _, tc := range tests {
		if tc.step.StepType() != tc.typ {
			t.Errorf("expected step type %q, got %q", tc.typ, tc.step.StepType())
		}
	}
}

func TestStepInterfaceMethods(t *testing.T) {
	step := &CommandStep{
		StepBase: StepBase{Name: "test-step", Condition: "ALWAYS", Enabled: true},
	}
	if step.GetName() != "test-step" {
		t.Errorf("expected name 'test-step', got %q", step.GetName())
	}
	if step.GetCondition() != "ALWAYS" {
		t.Errorf("expected condition 'ALWAYS', got %q", step.GetCondition())
	}
	if !step.GetEnabled() {
		t.Error("expected enabled true")
	}
}

func TestServiceStep(t *testing.T) {
	yamlData := `
name: mysql
image: mysql:8
command: --default-authentication-plugin=mysql_native_password
envVars:
  MYSQL_ROOT_PASSWORD: secret
ports:
  - 3306
readyCommand: mysqladmin ping -h localhost
`
	var svc Service
	if err := yaml.Unmarshal([]byte(yamlData), &svc); err != nil {
		t.Fatalf("unmarshal Service failed: %v", err)
	}
	if svc.Name != "mysql" {
		t.Errorf("expected name 'mysql', got %q", svc.Name)
	}
	if len(svc.Ports) != 1 || svc.Ports[0] != 3306 {
		t.Errorf("expected port 3306, got %v", svc.Ports)
	}
}

func TestJobDependency(t *testing.T) {
	yamlData := `
jobName: compile
requireSuccessful: true
artifacts: "bin/*"
destinationPath: output/
paramMatrix:
  - name: debug
    values:
      - "true"
      - "false"
`
	var dep JobDependency
	if err := yaml.Unmarshal([]byte(yamlData), &dep); err != nil {
		t.Fatalf("unmarshal JobDependency failed: %v", err)
	}
	if dep.JobName != "compile" {
		t.Errorf("expected jobName 'compile', got %q", dep.JobName)
	}
	if !dep.RequireSuccessful {
		t.Error("expected requireSuccessful true")
	}
	if len(dep.ParamMatrix) != 1 {
		t.Fatalf("expected 1 param matrix entry, got %d", len(dep.ParamMatrix))
	}
}

func TestProjectDependency(t *testing.T) {
	yamlData := `
projectPath: myorg/ci-tools
buildProvider:
  type: last-finished
artifacts: "tools/*"
destinationPath: ci-tools/
`
	var dep ProjectDependency
	if err := yaml.Unmarshal([]byte(yamlData), &dep); err != nil {
		t.Fatalf("unmarshal ProjectDependency failed: %v", err)
	}
	if dep.ProjectPath != "myorg/ci-tools" {
		t.Errorf("expected projectPath 'myorg/ci-tools', got %q", dep.ProjectPath)
	}
	if dep.BuildProvider.Type != BuildProviderLastFinished {
		t.Errorf("expected build provider type %q, got %q", BuildProviderLastFinished, dep.BuildProvider.Type)
	}
}

func TestImport(t *testing.T) {
	yamlData := `
projectPath: myorg/shared-pipeline
tag: v1.0
`
	var imp Import
	if err := yaml.Unmarshal([]byte(yamlData), &imp); err != nil {
		t.Fatalf("unmarshal Import failed: %v", err)
	}
	if imp.ProjectPath != "myorg/shared-pipeline" {
		t.Errorf("expected projectPath 'myorg/shared-pipeline', got %q", imp.ProjectPath)
	}
	if imp.Tag != "v1.0" {
		t.Errorf("expected tag 'v1.0', got %q", imp.Tag)
	}
}

func TestMarshalRoundTrip(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{
				Name: "build",
				Steps: Steps{
					&CommandStep{
						StepBase: StepBase{Name: "compile"},
						Image:    "golang:1.25",
						Commands: "go build ./...",
					},
					&CheckoutStep{
						StepBase: StepBase{Name: "clone"},
						WithLFS:  true,
					},
				},
				Triggers: Triggers{
					&BranchUpdateTrigger{
						Branches: "main",
					},
				},
			},
		},
		Services: []*Service{
			{Name: "redis", Image: "redis:7"},
		},
	}

	data, err := yaml.Marshal(spec)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	spec2, err := Parse(data)
	if err != nil {
		t.Fatalf("parse of marshaled spec failed: %v\n%s", err, string(data))
	}

	if len(spec2.Jobs) != 1 {
		t.Fatalf("round-trip: expected 1 job, got %d", len(spec2.Jobs))
	}
	job := spec2.Jobs[0]
	if len(job.Steps) != 2 {
		t.Fatalf("round-trip: expected 2 steps, got %d", len(job.Steps))
	}
	// Verify type preservation
	if _, ok := job.Steps[0].(*CommandStep); !ok {
		t.Fatalf("round-trip: expected step[0] type CommandStep, got %T", job.Steps[0])
	}
	if _, ok := job.Steps[1].(*CheckoutStep); !ok {
		t.Fatalf("round-trip: expected step[1] type CheckoutStep, got %T", job.Steps[1])
	}
	if len(job.Triggers) != 1 {
		t.Fatalf("round-trip: expected 1 trigger, got %d", len(job.Triggers))
	}
	if _, ok := job.Triggers[0].(*BranchUpdateTrigger); !ok {
		t.Fatalf("round-trip: expected trigger type BranchUpdateTrigger, got %T", job.Triggers[0])
	}
	if len(spec2.Services) != 1 {
		t.Fatalf("round-trip: expected 1 service, got %d", len(spec2.Services))
	}
}

func TestMarshalJSON(t *testing.T) {
	// Sanity check that JSON tags work (not a full round-trip test)
	spec := &BuildSpec{
		Jobs: []*Job{
			{Name: "test-job", Timeout: 3600},
		},
	}
	data, err := yaml.Marshal(spec)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty marshaled data")
	}
}

func TestMinimalJob(t *testing.T) {
	yamlData := `
name: minimal
`
	var job Job
	if err := yaml.Unmarshal([]byte(yamlData), &job); err != nil {
		t.Fatalf("unmarshal minimal job failed: %v", err)
	}
	if job.Name != "minimal" {
		t.Errorf("expected name 'minimal', got %q", job.Name)
	}
}

func TestCreatePullRequestStep(t *testing.T) {
	yamlData := `
type: create-pull-request
name: Create PR
targetBranch: main
prTitle: Auto PR from build
prBody: This PR was automatically created
`
	var step CreatePullRequestStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal CreatePullRequestStep failed: %v", err)
	}
	if step.TargetBranch != "main" {
		t.Errorf("expected targetBranch 'main', got %q", step.TargetBranch)
	}
	if step.PRTitle != "Auto PR from build" {
		t.Errorf("expected PR title, got %q", step.PRTitle)
	}
}

func TestSetBuildVersionStep(t *testing.T) {
	yamlData := `
type: set-build-version
name: Set version
version: 1.0.0-{{ build.number }}
`
	var step SetBuildVersionStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal SetBuildVersionStep failed: %v", err)
	}
	if step.Version != "1.0.0-{{ build.number }}" {
		t.Errorf("expected version template, got %q", step.Version)
	}
}

func TestCreateBranchStep(t *testing.T) {
	yamlData := `
type: create-branch
name: Create release branch
branchName: release/{{ version }}
commitMessage: Create branch for release
`
	var step CreateBranchStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal CreateBranchStep failed: %v", err)
	}
	if step.BranchName != "release/{{ version }}" {
		t.Errorf("expected branch name, got %q", step.BranchName)
	}
}

func TestCreateTagStep(t *testing.T) {
	yamlData := `
type: create-tag
name: Create tag
tagName: v{{ version }}
message: Release {{ version }}
`
	var step CreateTagStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal CreateTagStep failed: %v", err)
	}
	if step.TagName != "v{{ version }}" {
		t.Errorf("expected tag name, got %q", step.TagName)
	}
}

func TestPushImageStep(t *testing.T) {
	yamlData := `
type: push-image
name: Push to registry
imageTags:
  - registry.example.com/myapp:latest
  - registry.example.com/myapp:{{ version }}
registryLogins:
  - registryUrl: https://registry.example.com
    userName: builder
    passwordSecret: docker-password
`
	var step PushImageStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal PushImageStep failed: %v", err)
	}
	if len(step.ImageTags) != 2 {
		t.Fatalf("expected 2 image tags, got %d", len(step.ImageTags))
	}
}

func TestPullImageStep(t *testing.T) {
	yamlData := `
type: pull-image
name: Pull base image
imageTags:
  - ubuntu:22.04
`
	var step PullImageStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal PullImageStep failed: %v", err)
	}
	if len(step.ImageTags) != 1 {
		t.Fatalf("expected 1 image tag, got %d", len(step.ImageTags))
	}
}

func TestRunContainerStep(t *testing.T) {
	yamlData := `
type: run-container
name: Run test container
image: ubuntu:22.04
commands: echo hello
envVars:
  TEST_MODE: "1"
`
	var step RunContainerStep
	if err := yaml.Unmarshal([]byte(yamlData), &step); err != nil {
		t.Fatalf("unmarshal RunContainerStep failed: %v", err)
	}
	if step.Image != "ubuntu:22.04" {
		t.Errorf("expected image, got %q", step.Image)
	}
}

func TestStepTemplateWithUseTemplate(t *testing.T) {
	yamlData := `
name: outer-template
steps:
  - type: use-template
    name: Use inner
    templateName: inner-template
    paramMatrix:
      - name: version
        values:
          - "1.0"
`
	var tmpl StepTemplate
	if err := yaml.Unmarshal([]byte(yamlData), &tmpl); err != nil {
		t.Fatalf("unmarshal StepTemplate failed: %v", err)
	}
	if len(tmpl.Steps) != 1 {
		t.Fatalf("expected 1 step, got %d", len(tmpl.Steps))
	}
	uts, ok := tmpl.Steps[0].(*UseTemplateStep)
	if !ok {
		t.Fatalf("expected UseTemplateStep, got %T", tmpl.Steps[0])
	}
	if uts.TemplateName != "inner-template" {
		t.Errorf("expected templateName 'inner-template', got %q", uts.TemplateName)
	}
}

func TestScheduleTrigger(t *testing.T) {
	yamlData := `
type: schedule
cronExpression: 0 */6 * * *
`
	var trigger ScheduleTrigger
	if err := yaml.Unmarshal([]byte(yamlData), &trigger); err != nil {
		t.Fatalf("unmarshal ScheduleTrigger failed: %v", err)
	}
	if trigger.CronExpression != "0 */6 * * *" {
		t.Errorf("expected cron expression, got %q", trigger.CronExpression)
	}
}

func TestDependencyFinishedTrigger(t *testing.T) {
	yamlData := `
type: dependency-finished
jobNames:
  - build
  - test
`
	var trigger DependencyFinishedTrigger
	if err := yaml.Unmarshal([]byte(yamlData), &trigger); err != nil {
		t.Fatalf("unmarshal DependencyFinishedTrigger failed: %v", err)
	}
	if len(trigger.JobNames) != 2 {
		t.Fatalf("expected 2 job names, got %d", len(trigger.JobNames))
	}
}

func TestPullRequestTriggers(t *testing.T) {
	tests := []struct {
		name     string
		yaml     string
		typ      TriggerType
	}{
		{
			name: "pull-request",
			yaml: `- type: pull-request
  branches: main
`,
			typ: TriggerTypePullRequest,
		},
		{
			name: "pull-request-update",
			yaml: `- type: pull-request-update
  branches: develop
`,
			typ: TriggerTypePullRequestUpdate,
		},
		{
			name: "pull-request-merge",
			yaml: `- type: pull-request-merge
  branches: main
`,
			typ: TriggerTypePullRequestMerge,
		},
		{
			name: "pull-request-discard",
			yaml: `- type: pull-request-discard
  branches: feature/*
`,
			typ: TriggerTypePullRequestDiscard,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var triggers Triggers
			if err := yaml.Unmarshal([]byte(tc.yaml), &triggers); err != nil {
				t.Fatalf("unmarshal %s failed: %v", tc.name, err)
			}
			if len(triggers) != 1 {
				t.Fatalf("expected 1 trigger, got %d", len(triggers))
			}
			if triggers[0].TriggerType() != tc.typ {
				t.Errorf("expected type %q, got %q", tc.typ, triggers[0].TriggerType())
			}
		})
	}
}

func TestFloatParam(t *testing.T) {
	yamlData := `
type: float
name: threshold
defaultValue: 0.5
minValue: 0.0
maxValue: 1.0
`
	var param FloatParam
	if err := yaml.Unmarshal([]byte(yamlData), &param); err != nil {
		t.Fatalf("unmarshal FloatParam failed: %v", err)
	}
	if param.DefaultValue != 0.5 {
		t.Errorf("expected defaultValue 0.5, got %f", param.DefaultValue)
	}
	if *param.MinValue != 0.0 {
		t.Errorf("expected minValue 0.0, got %f", *param.MinValue)
	}
}

func TestSecretParam(t *testing.T) {
	yamlData := `
type: secret
name: api-token
description: API token for external service
`
	var param SecretParam
	if err := yaml.Unmarshal([]byte(yamlData), &param); err != nil {
		t.Fatalf("unmarshal SecretParam failed: %v", err)
	}
	if param.Name != "api-token" {
		t.Errorf("expected name 'api-token', got %q", param.Name)
	}
}

func TestDateParam(t *testing.T) {
	yamlData := `
type: date
name: release-date
defaultValue: "2026-06-25"
`
	var param DateParam
	if err := yaml.Unmarshal([]byte(yamlData), &param); err != nil {
		t.Fatalf("unmarshal DateParam failed: %v", err)
	}
	if param.DefaultValue != "2026-06-25" {
		t.Errorf("expected defaultValue '2026-06-25', got %q", param.DefaultValue)
	}
}

func TestBranchUpdateTriggerWithPaths(t *testing.T) {
	yamlData := `
type: branch-update
branches: main
paths: src/**
`
	var trigger BranchUpdateTrigger
	if err := yaml.Unmarshal([]byte(yamlData), &trigger); err != nil {
		t.Fatalf("unmarshal BranchUpdateTrigger with paths failed: %v", err)
	}
	if trigger.Paths != "src/**" {
		t.Errorf("expected paths 'src/**', got %q", trigger.Paths)
	}
}

func TestPullRequestTriggerWithPaths(t *testing.T) {
	yamlData := `
type: pull-request
branches: main
paths: docs/**
`
	var trigger PullRequestTrigger
	if err := yaml.Unmarshal([]byte(yamlData), &trigger); err != nil {
		t.Fatalf("unmarshal PullRequestTrigger with paths failed: %v", err)
	}
	if trigger.Paths != "docs/**" {
		t.Errorf("expected paths 'docs/**', got %q", trigger.Paths)
	}
}

func TestValidatePassesValid(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{Name: "build"},
			{Name: "test"},
		},
		Services: []*Service{
			{Name: "redis", Image: "redis:7"},
		},
	}
	err := spec.Validate()
	if err != nil {
		t.Fatalf("expected no validation error, got: %v", err)
	}
}

func TestValidateUndefinedTemplateRef(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{
				Name: "build",
				Steps: Steps{
					&UseTemplateStep{TemplateName: "nonexistent"},
				},
			},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for undefined template reference")
	}
}

func TestValidateUndefinedDependency(t *testing.T) {
	spec := &BuildSpec{
		Jobs: []*Job{
			{
				Name: "build",
				JobDependencies: []*JobDependency{
					{JobName: "nonexistent"},
				},
			},
		},
	}
	err := spec.Validate()
	if err == nil {
		t.Fatal("expected validation error for undefined dependency reference")
	}
}

func TestBuildProviderConstants(t *testing.T) {
	if BuildProviderLastFinished != "last-finished" {
		t.Errorf("expected BuildProviderLastFinished 'last-finished', got %q", BuildProviderLastFinished)
	}
	if BuildProviderSpecified != "specified" {
		t.Errorf("expected BuildProviderSpecified 'specified', got %q", BuildProviderSpecified)
	}

	// Marshal and unmarshal a SpecifiedBuild provider
	yamlData := `
type: specified
buildNumber: 42
`
	var provider BuildProvider
	if err := yaml.Unmarshal([]byte(yamlData), &provider); err != nil {
		t.Fatalf("unmarshal BuildProvider failed: %v", err)
	}
	if provider.Type != BuildProviderSpecified {
		t.Errorf("expected type %q, got %q", BuildProviderSpecified, provider.Type)
	}
	if provider.BuildNumber != 42 {
		t.Errorf("expected buildNumber 42, got %d", provider.BuildNumber)
	}
}

func TestMustParse(t *testing.T) {
	yamlData := `
jobs:
  - name: build
`
	spec := MustParse([]byte(yamlData))
	if spec == nil {
		t.Fatal("expected non-nil spec")
	}
	if len(spec.Jobs) != 1 {
		t.Fatalf("expected 1 job, got %d", len(spec.Jobs))
	}
}

func TestMustParsePanicsOnBadInput(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic on invalid YAML")
		}
	}()
	MustParse([]byte("{{ invalid yaml"))
}

func TestEmptyBuildSpec(t *testing.T) {
	spec, err := Parse([]byte(""))
	if err != nil {
		t.Fatalf("parse empty spec failed: %v", err)
	}
	if spec == nil {
		t.Fatal("expected non-nil spec for empty input")
	}
}

func TestModelDefaultConstructorValues(t *testing.T) {
	// Verify that default values on types match expected OneDev defaults
	step := &CommandStep{}
	if step.Interpreter != "" {
		t.Errorf("expected empty interpreter default")
	}
}

func TestPublishReportStepTypes(t *testing.T) {
	if ReportTypeJUnit != "junit" {
		t.Errorf("expected ReportTypeJUnit 'junit', got %q", ReportTypeJUnit)
	}
	if ReportTypeClover != "clover" {
		t.Errorf("expected ReportTypeClover 'clover', got %q", ReportTypeClover)
	}
	if ReportTypeGeneric != "generic" {
		t.Errorf("expected ReportTypeGeneric 'generic', got %q", ReportTypeGeneric)
	}
}

func TestChoiceParamAllowMultiple(t *testing.T) {
	yamlData := `
type: choice
name: env
choices:
  - dev
  - prod
defaultValue: dev
allowMultiple: true
`
	var param ChoiceParam
	if err := yaml.Unmarshal([]byte(yamlData), &param); err != nil {
		t.Fatalf("unmarshal ChoiceParam with allowMultiple failed: %v", err)
	}
	if !param.AllowMultiple {
		t.Error("expected allowMultiple true")
	}
}

func TestParamInstances(t *testing.T) {
	yamlData := `
name: debug
values:
  - "true"
  - "false"
`
	var pi ParamInstances
	if err := yaml.Unmarshal([]byte(yamlData), &pi); err != nil {
		t.Fatalf("unmarshal ParamInstances failed: %v", err)
	}
	if len(pi.Values) != 2 {
		t.Fatalf("expected 2 values, got %d", len(pi.Values))
	}
}

func TestParamMap(t *testing.T) {
	yamlData := `
params:
  debug: "true"
  version: "2.0"
`
	var pm ParamMap
	if err := yaml.Unmarshal([]byte(yamlData), &pm); err != nil {
		t.Fatalf("unmarshal ParamMap failed: %v", err)
	}
	if pm.Params["debug"] != "true" {
		t.Errorf("expected debug=true, got %q", pm.Params["debug"])
	}
}

func TestBuildSpecBlobPath(t *testing.T) {
	if BuildSpecBLOBPath != ".onedev-buildspec.yml" {
		t.Errorf("expected BLOB_PATH '.onedev-buildspec.yml', got %q", BuildSpecBLOBPath)
	}
}
