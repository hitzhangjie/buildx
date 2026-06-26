/** Polymorphic type metadata for buildspec BeanEditors (mirrors OneDev @Editable types). */

export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "textarea"
  | "enum"
  | "stringList";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  description?: string;
  placeholder?: string;
  enumValues?: string[];
  /** Hide when another field equals value (OneDev @DependsOn). */
  hideWhen?: { field: string; equals: string | boolean };
};

export type TypeDef = {
  type: string;
  label: string;
  group?: string;
  description?: string;
  fields: FieldDef[];
  defaults?: Record<string, unknown>;
};

const stepBaseFields: FieldDef[] = [
  { key: "name", label: "Name", kind: "string" },
  { key: "condition", label: "Condition", kind: "string", placeholder: "always" },
  { key: "enabled", label: "Enabled", kind: "boolean" },
];

// STEP_TYPES mirrors OneDev's Step class hierarchy — groups, labels, and ordering
// match @Editable annotations on each Step subclass in io.onedev.server.buildspec.step.
// Ungrouped steps appear first; groups follow in OneDev @Editable order.
export const STEP_TYPES: TypeDef[] = [
  // ── Ungrouped (block 1) ─────────────────────────────────────────────────
  {
    type: "checkout",            // order=50  CheckoutStep
    label: "Checkout Code",
    fields: [
      ...stepBaseFields,
      { key: "withLfs", label: "Retrieve LFS Files", kind: "boolean" },
      { key: "withSubmodules", label: "Retrieve Submodules", kind: "boolean" },
      { key: "cloneDepth", label: "Clone Depth", kind: "number" },
      { key: "checkoutPath", label: "Checkout Path", kind: "string" },
    ],
    defaults: { type: "checkout", enabled: true },
  },
  {
    type: "setup-cache",         // order=55  SetupCacheStep
    label: "Set Up Cache",
    description: "Set up job cache to speed up job execution",
    fields: [
      ...stepBaseFields,
      { key: "key", label: "Cache Key", kind: "string", required: true },
      { key: "paths", label: "Cache Paths", kind: "stringList", required: true },
      { key: "checksumFiles", label: "Checksum Files", kind: "string" },
      {
        key: "uploadStrategy",
        label: "Upload Strategy",
        kind: "enum",
        enumValues: ["", "always", "on-success"],
      },
    ],
    defaults: { type: "setup-cache", enabled: true },
  },
  {
    type: "command",             // order=100 CommandStep
    label: "Execute Commands",
    description: "Run commands inside specified container image",
    fields: [
      ...stepBaseFields,
      { key: "image", label: "Image", kind: "string", required: true },
      { key: "interpreter", label: "Interpreter", kind: "string" },
      { key: "commands", label: "Commands", kind: "textarea", required: true },
      { key: "useTTY", label: "Enable TTY Mode", kind: "boolean" },
    ],
    defaults: { type: "command", enabled: true },
  },
  // ── Security & Compliance ────────────────────────────────────────────────
  {
    type: "osv-scan-source",
    label: "OSV Scan Source",
    group: "Security & Compliance",
    description: "Scan source dependencies for vulnerabilities",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
      { key: "failThreshold", label: "Fail Threshold", kind: "enum", enumValues: ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    ],
    defaults: { type: "osv-scan-source", enabled: true },
  },
  {
    type: "osv-scan-binaries",
    label: "OSV Scan Binaries",
    group: "Security & Compliance",
    description: "Scan built binaries for vulnerabilities",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
      { key: "failThreshold", label: "Fail Threshold", kind: "enum", enumValues: ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    ],
    defaults: { type: "osv-scan-binaries", enabled: true },
  },
  {
    type: "osv-scan-image",
    label: "OSV Scan Image",
    group: "Security & Compliance",
    description: "Scan container images for vulnerabilities",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
      { key: "failThreshold", label: "Fail Threshold", kind: "enum", enumValues: ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"] },
    ],
    defaults: { type: "osv-scan-image", enabled: true },
  },
  {
    type: "scan-license",
    label: "Scan License",
    group: "Security & Compliance",
    description: "Scan dependencies for license compliance",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
      { key: "allowedLicenses", label: "Allowed Licenses", kind: "stringList" },
    ],
    defaults: { type: "scan-license", enabled: true },
  },
  {
    type: "scan-secrets",
    label: "Scan Secrets",
    group: "Security & Compliance",
    description: "Scan source files for exposed secrets",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
    ],
    defaults: { type: "scan-secrets", enabled: true },
  },
  // ── Dependency Management ────────────────────────────────────────────────
  {
    type: "check-dependencies",
    label: "Check Dependencies",
    group: "Dependency Management",
    description: "Check project dependencies for known issues",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string" },
    ],
    defaults: { type: "check-dependencies", enabled: true },
  },
  {
    type: "generate-sbom",
    label: "Generate SBOM",
    group: "Dependency Management",
    description: "Generate a Software Bill of Materials",
    fields: [
      ...stepBaseFields,
      { key: "sbomFormat", label: "SBOM Format", kind: "enum", enumValues: ["cyclonedx", "spdx"] },
      { key: "outputPath", label: "Output Path", kind: "string" },
    ],
    defaults: { type: "generate-sbom", enabled: true },
  },
  // ── Ungrouped (block 2) ─────────────────────────────────────────────────
  {
    type: "run-container",       // order=150 RunContainerStep
    label: "Run Docker Container",
    description: "Run specified docker container. Job workdir is mounted into the container",
    fields: [
      ...stepBaseFields,
      { key: "image", label: "Image", kind: "string", required: true },
      { key: "args", label: "Arguments", kind: "string" },
      { key: "workingDir", label: "Working Directory", kind: "string" },
    ],
    defaults: { type: "run-container", enabled: true },
  },
  {
    type: "set-build-version",   // order=260 SetBuildVersionStep
    label: "Set Build Version",
    fields: [
      ...stepBaseFields,
      { key: "buildVersion", label: "Build Version", kind: "string", required: true },
    ],
    defaults: { type: "set-build-version", enabled: true },
  },
  {
    type: "set-build-description", // order=265 SetBuildDescriptionStep
    label: "Set Build Description",
    fields: [
      ...stepBaseFields,
      { key: "buildDescription", label: "Build Description", kind: "textarea", required: true },
    ],
    defaults: { type: "set-build-description", enabled: true },
  },
  {
    type: "create-branch",       // order=280 CreateBranchStep
    label: "Create Branch",
    fields: [
      ...stepBaseFields,
      { key: "branchName", label: "Branch Name", kind: "string", required: true },
      { key: "branchRevision", label: "Branch Revision", kind: "string" },
    ],
    defaults: { type: "create-branch", enabled: true },
  },
  {
    type: "create-tag",          // order=300 CreateTagStep
    label: "Create Tag",
    fields: [
      ...stepBaseFields,
      { key: "tagName", label: "Tag Name", kind: "string", required: true },
      { key: "tagMessage", label: "Tag Message", kind: "string" },
    ],
    defaults: { type: "create-tag", enabled: true },
  },
  {
    type: "create-pull-request", // order=350 CreatePullRequestStep
    label: "Create Pull Request",
    fields: [
      ...stepBaseFields,
      { key: "targetBranch", label: "Target Branch", kind: "string", required: true },
      { key: "sourceBranch", label: "Source Branch", kind: "string", required: true },
      { key: "prTitle", label: "PR Title", kind: "string", required: true },
      { key: "prBody", label: "PR Body", kind: "textarea" },
    ],
    defaults: { type: "create-pull-request", enabled: true },
  },
  {
    type: "close-iteration",     // order=400 CloseIterationStep
    label: "Close Iteration",
    fields: [
      ...stepBaseFields,
      { key: "iterationName", label: "Iteration Name", kind: "string", required: true },
    ],
    defaults: { type: "close-iteration", enabled: true },
  },
  // ── Docker Image ───────────────────────────────────────────────────────
  {
    type: "build-image",         // order=160 BuildImageStep
    label: "Build Image",
    group: "Docker Image",
    description: "Build docker image with docker buildx",
    fields: [
      ...stepBaseFields,
      { key: "buildPath", label: "Build Path", kind: "string" },
      { key: "dockerfile", label: "Dockerfile", kind: "string" },
      { key: "tags", label: "Tags", kind: "stringList" },
      { key: "platforms", label: "Platforms", kind: "string" },
      { key: "moreOptions", label: "More Options", kind: "string" },
    ],
    defaults: { type: "build-image", enabled: true },
  },
  {
    type: "build-image-kaniko",  // order=200 BuildImageWithKanikoStep
    label: "Build Image (Kaniko)",
    group: "Docker Image",
    description: "Build docker image with kaniko",
    fields: [
      ...stepBaseFields,
      { key: "buildContext", label: "Build Context", kind: "string" },
      { key: "tags", label: "Tags", kind: "stringList" },
      { key: "trustCertificates", label: "Certificates to Trust", kind: "textarea" },
      { key: "moreOptions", label: "More Options", kind: "string" },
    ],
    defaults: { type: "build-image-kaniko", enabled: true },
  },
  {
    type: "run-imagetools",      // order=230 RunImagetoolsStep
    label: "Run Buildx Image Tools",
    group: "Docker Image",
    description: "Run docker buildx imagetools command with specified arguments",
    fields: [
      ...stepBaseFields,
      { key: "arguments", label: "Arguments", kind: "string", required: true },
    ],
    defaults: { type: "run-imagetools", enabled: true },
  },
  {
    type: "pull-image",          // order=240 PullImageStep
    label: "Pull Image",
    group: "Docker Image",
    description: "Pull docker image as OCI layout via crane",
    fields: [
      ...stepBaseFields,
      { key: "srcImage", label: "Source Docker Image", kind: "string", required: true },
      { key: "destPath", label: "OCI Layout Directory", kind: "string", required: true },
      { key: "platform", label: "Platform", kind: "string" },
      { key: "moreOptions", label: "More Options", kind: "string" },
    ],
    defaults: { type: "pull-image", enabled: true },
  },
  {
    type: "push-image",          // order=250 PushImageStep
    label: "Push Image",
    group: "Docker Image",
    description: "Push docker image from OCI layout via crane",
    fields: [
      ...stepBaseFields,
      { key: "srcPath", label: "OCI Layout Directory", kind: "string", required: true },
      { key: "destImage", label: "Target Docker Image", kind: "string", required: true },
      { key: "moreOptions", label: "More Options", kind: "string" },
    ],
    defaults: { type: "push-image", enabled: true },
  },
  {
    type: "prune-builder-cache", // order=260 PruneBuilderCacheStep
    label: "Prune Builder Cache",
    group: "Docker Image",
    description: "Prune image cache of docker buildx builder",
    fields: [
      ...stepBaseFields,
      { key: "options", label: "Options", kind: "string" },
    ],
    defaults: { type: "prune-builder-cache", enabled: true },
  },
  // ── Publish ────────────────────────────────────────────────────────────
  // 24 concrete step types matching OneDev Publish group; order follows
  // the Add Step dropdown as verified against reference OneDev instance.
  {
    type: "publish-artifact",    // order=1050 PublishArtifactStep
    label: "Artifacts",
    group: "Publish",
    description: "Copy files from job working directory to build artifacts directory",
    fields: [
      ...stepBaseFields,
      { key: "sourcePath", label: "From Directory", kind: "string" },
      { key: "artifacts", label: "Artifacts", kind: "string", required: true },
    ],
    defaults: { type: "publish-artifact", enabled: true },
  },
  // -- coverage reports -------------------------------------------------
  {
    type: "publish-cobertura-report",
    label: "Cobertura Coverage Report",
    group: "Publish",
    description: "Publish Cobertura code coverage report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-cobertura-report", enabled: true },
  },
  {
    type: "publish-clover-report",
    label: "Clover Coverage Report",
    group: "Publish",
    description: "Publish Clover code coverage report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-clover-report", enabled: true },
  },
  {
    type: "publish-jest-coverage-report",
    label: "Jest Coverage Report",
    group: "Publish",
    description: "Publish Jest code coverage report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-jest-coverage-report", enabled: true },
  },
  {
    type: "publish-jacoco-report",
    label: "JaCoCo Coverage Report",
    group: "Publish",
    description: "Publish JaCoCo code coverage report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-jacoco-report", enabled: true },
  },
  // -- problem / static-analysis reports ---------------------------------
  {
    type: "publish-cpd-report",
    label: "CPD Report",
    group: "Publish",
    description: "Publish CPD (copy-paste detector) report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-cpd-report", enabled: true },
  },
  {
    type: "publish-checkstyle-report",
    label: "Checkstyle Report",
    group: "Publish",
    description: "Publish Checkstyle report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-checkstyle-report", enabled: true },
  },
  {
    type: "publish-eslint-report",
    label: "ESLint Report",
    group: "Publish",
    description: "Publish ESLint report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-eslint-report", enabled: true },
  },
  {
    type: "publish-clippy-report",
    label: "Clippy Report",
    group: "Publish",
    description: "Publish Clippy (Rust linter) report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-clippy-report", enabled: true },
  },
  {
    type: "publish-cppcheck-report",
    label: "Cppcheck Report",
    group: "Publish",
    description: "Publish Cppcheck report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-cppcheck-report", enabled: true },
  },
  {
    type: "publish-mypy-report",
    label: "Mypy Report",
    group: "Publish",
    description: "Publish Mypy report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-mypy-report", enabled: true },
  },
  {
    type: "publish-pmd-report",
    label: "PMD Report",
    group: "Publish",
    description: "Publish PMD report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-pmd-report", enabled: true },
  },
  {
    type: "publish-pylint-report",
    label: "Pylint Report",
    group: "Publish",
    description: "Publish Pylint report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-pylint-report", enabled: true },
  },
  {
    type: "publish-roslynator-report",
    label: "Roslynator Report",
    group: "Publish",
    description: "Publish Roslynator report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-roslynator-report", enabled: true },
  },
  {
    type: "publish-ruff-report",
    label: "Ruff Report",
    group: "Publish",
    description: "Publish Ruff report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-ruff-report", enabled: true },
  },
  {
    type: "publish-spotbugs-report",
    label: "SpotBugs Report",
    group: "Publish",
    description: "Publish SpotBugs report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-spotbugs-report", enabled: true },
  },
  // -- unit-test reports -------------------------------------------------
  {
    type: "publish-gtest-report",
    label: "Google Test Report",
    group: "Publish",
    description: "Publish Google Test (gtest) report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-gtest-report", enabled: true },
  },
  {
    type: "publish-junit-report",
    label: "JUnit Report",
    group: "Publish",
    description: "Publish JUnit test report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-junit-report", enabled: true },
  },
  {
    type: "publish-jest-report",
    label: "Jest Test Report",
    group: "Publish",
    description: "Publish Jest test report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-jest-report", enabled: true },
  },
  {
    type: "publish-trx-report",
    label: "TRX Report (.net unit test)",
    group: "Publish",
    description: "Publish TRX (.net unit test) report",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-trx-report", enabled: true },
  },
  // -- misc reports ------------------------------------------------------
  {
    type: "publish-html-report",
    label: "Html Report",
    group: "Publish",
    description: "Publish an HTML report to build results",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportDir", label: "Report Directory", kind: "string", required: true },
    ],
    defaults: { type: "publish-html-report", enabled: true },
  },
  {
    type: "publish-markdown-report",
    label: "Markdown Report",
    group: "Publish",
    description: "Publish a Markdown report to build results",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-markdown-report", enabled: true },
  },
  {
    type: "publish-pr-markdown-report",
    label: "Pull Request Markdown Report",
    group: "Publish",
    description: "Publish a Markdown report as pull request comment",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      { key: "reportFile", label: "Report File", kind: "string", required: true },
    ],
    defaults: { type: "publish-pr-markdown-report", enabled: true },
  },
  {
    type: "publish-site",        // order=1060 PublishSiteStep
    label: "Site",
    group: "Publish",
    description: "Publish specified files to be served as project web site",
    fields: [
      ...stepBaseFields,
      { key: "projectPath", label: "Project", kind: "string" },
      { key: "sourcePath", label: "From Directory", kind: "string" },
      { key: "siteFiles", label: "Site Files", kind: "string", required: true },
    ],
    defaults: { type: "publish-site", enabled: true },
  },
  // ── Repository Sync ────────────────────────────────────────────────────
  {
    type: "pull-repository",     // order=1070 PullRepository
    label: "Pull from Remote",
    group: "Repository Sync",
    description: "Pull specified refs from remote",
    fields: [
      ...stepBaseFields,
      { key: "targetProject", label: "Target Project", kind: "string" },
      { key: "refs", label: "Refs", kind: "string", required: true },
      { key: "withLfs", label: "Transfer LFS Files", kind: "boolean" },
    ],
    defaults: { type: "pull-repository", enabled: true },
  },
  {
    type: "push-repository",     // order=1080 PushRepository
    label: "Push to Remote",
    group: "Repository Sync",
    description: "Push current commit to same ref on remote",
    fields: [
      ...stepBaseFields,
      { key: "targetProject", label: "Target Project", kind: "string" },
      { key: "refs", label: "Refs", kind: "string", required: true },
      { key: "withLfs", label: "Transfer LFS Files", kind: "boolean" },
    ],
    defaults: { type: "push-repository", enabled: true },
  },
  // ── Utilities ──────────────────────────────────────────────────────────
  {
    type: "ssh-command",         // order=1090 SSHCommandStep
    label: "Execute Commands via SSH",
    group: "Utilities",
    description: "Execute commands on a remote machine via SSH",
    fields: [
      ...stepBaseFields,
      { key: "remoteMachine", label: "Remote Machine", kind: "string", required: true },
      { key: "userName", label: "User Name", kind: "string", required: true },
      { key: "commands", label: "Commands", kind: "textarea", required: true },
      { key: "options", label: "Options", kind: "string" },
    ],
    defaults: { type: "ssh-command", enabled: true },
  },
  {
    type: "scp-command",         // order=1100 SCPCommandStep
    label: "Copy Files with SCP",
    group: "Utilities",
    description: "Copy files with SCP",
    fields: [
      ...stepBaseFields,
      { key: "source", label: "Source", kind: "string", required: true },
      { key: "target", label: "Target", kind: "string", required: true },
      { key: "options", label: "Options", kind: "string" },
    ],
    defaults: { type: "scp-command", enabled: true },
  },
  // ── Ungrouped (end) ────────────────────────────────────────────────────
  {
    type: "use-template",        // order=10000 UseTemplateStep
    label: "Use Step Template",
    description: "Run specified step template",
    fields: [
      ...stepBaseFields,
      { key: "templateName", label: "Template Name", kind: "string", required: true },
    ],
    defaults: { type: "use-template", enabled: true },
  },
];

export const TRIGGER_TYPES: TypeDef[] = [
  {
    type: "branch-update",
    label: "Branch Update",
    fields: [
      { key: "branches", label: "Branches", kind: "string", required: true },
      { key: "paths", label: "Paths", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "branch-update" },
  },
  {
    type: "tag-create",
    label: "Tag Create",
    fields: [
      { key: "tags", label: "Tags", kind: "string", required: true },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "tag-create" },
  },
  {
    type: "pull-request",
    label: "Pull Request Open",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request" },
  },
  {
    type: "pull-request-update",
    label: "Pull Request Update",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request-update" },
  },
  {
    type: "pull-request-merge",
    label: "Pull Request Merge",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request-merge" },
  },
  {
    type: "pull-request-discard",
    label: "Pull Request Discard",
    fields: [{ key: "projects", label: "Projects", kind: "string" }],
    defaults: { type: "pull-request-discard" },
  },
  {
    type: "schedule",
    label: "Schedule",
    fields: [
      { key: "cronExpression", label: "Cron Expression", kind: "string", required: true },
      { key: "branches", label: "Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "schedule" },
  },
  {
    type: "dependency-finished",
    label: "Dependency Finished",
    fields: [{ key: "projects", label: "Projects", kind: "string" }],
    defaults: { type: "dependency-finished" },
  },
];

export const PARAM_SPEC_TYPES: TypeDef[] = [
  {
    type: "text",
    label: "Text",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "allowEmpty", label: "Allow Empty", kind: "boolean" },
      { key: "allowMultiple", label: "Allow Multiple", kind: "boolean" },
      { key: "defaultValueProvider", label: "Default Value", kind: "string" },
    ],
    defaults: { type: "text" },
  },
  {
    type: "boolean",
    label: "Boolean",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "enum", enumValues: ["true", "false"] },
    ],
    defaults: { type: "boolean" },
  },
  {
    type: "secret",
    label: "Secret",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "secret" },
  },
  {
    type: "integer",
    label: "Integer",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "number" },
    ],
    defaults: { type: "integer" },
  },
  {
    type: "float",
    label: "Float",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "number" },
    ],
    defaults: { type: "float" },
  },
  {
    type: "choice",
    label: "Choice",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "choices", label: "Choices", kind: "stringList", required: true },
      { key: "defaultValueProvider", label: "Default Value", kind: "string" },
    ],
    defaults: { type: "choice" },
  },
  {
    type: "date",
    label: "Date",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "date" },
  },
  {
    type: "commit",
    label: "Commit",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "commit" },
  },
];

export const POST_BUILD_ACTION_TYPES: TypeDef[] = [
  {
    type: "create-issue",
    label: "Create Issue",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "issueFields", label: "Issue Fields", kind: "textarea" },
    ],
    defaults: { type: "create-issue" },
  },
  {
    type: "run-job",
    label: "Run Job",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "jobName", label: "Job Name", kind: "string", required: true },
    ],
    defaults: { type: "run-job" },
  },
  {
    type: "send-notification",
    label: "Send Notification",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "notificationTemplate", label: "Template", kind: "string" },
    ],
    defaults: { type: "send-notification" },
  },
];

export const JOB_DEPENDENCY_FIELDS: FieldDef[] = [
  { key: "jobName", label: "Job Name", kind: "string", required: true },
  { key: "requireSuccessful", label: "Require Successful", kind: "boolean" },
  { key: "artifacts", label: "Artifacts", kind: "string" },
  { key: "destinationPath", label: "Destination Path", kind: "string" },
];

export const PROJECT_DEPENDENCY_FIELDS: FieldDef[] = [
  { key: "projectPath", label: "Project Path", kind: "string", required: true },
  {
    key: "buildProvider.type",
    label: "Build Provider",
    kind: "enum",
    enumValues: ["last-finished", "specified"],
  },
  { key: "buildProvider.buildNumber", label: "Build Number", kind: "number" },
  { key: "artifacts", label: "Artifacts", kind: "string" },
  { key: "destinationPath", label: "Destination Path", kind: "string" },
];

export function findTypeDef(types: readonly TypeDef[], type: string | undefined): TypeDef | undefined {
  return types.find((t) => t.type === type);
}

export function stepDisplayName(step: Record<string, unknown>): string {
  const name = step.name;
  if (typeof name === "string" && name.trim()) {
    return name;
  }
  const type = typeof step.type === "string" ? step.type : "step";
  return type;
}

export function stepConditionLabel(step: Record<string, unknown>): string {
  const condition = step.condition;
  if (typeof condition === "string" && condition.trim()) {
    return condition;
  }
  return "Unspecified";
}

export function groupedTypeLabel(typeDef: TypeDef): string {
  if (typeDef.group) {
    return `${typeDef.group} / ${typeDef.label}`;
  }
  return typeDef.label;
}

export function triggerDescription(item: Record<string, unknown>): string {
  const type = typeof item.type === "string" ? item.type : "";
  return findTypeDef(TRIGGER_TYPES, type)?.label ?? type;
}

export function triggerParamCount(item: Record<string, unknown>): number {
  const matrix = item.paramMatrix;
  return Array.isArray(matrix) ? matrix.length : 0;
}

export function polymorphicSummary(item: Record<string, unknown>, types: TypeDef[]): string {
  const type = typeof item.type === "string" ? item.type : "";
  const def = findTypeDef(types, type);
  const name =
    typeof item.name === "string"
      ? item.name
      : typeof item.jobName === "string"
        ? item.jobName
        : typeof item.projectPath === "string"
          ? item.projectPath
          : "";
  if (name) {
    return name;
  }
  return def?.label ?? type ?? "No Name";
}

/** Stub job suggestions (plugins not wired — UI parity only). */
export const STUB_JOB_SUGGESTIONS: { name: string; steps: Record<string, unknown>[] }[] = [];
