export type LayoutKind = "main" | "simple";

export type KnownPage =
  // Wave 0/1 core
  | "projects"
  | "login"
  | "logout"
  | "signup"
  | "serverInit"
  | "newProject"
  | "issues"
  | "pulls"
  | "builds"
  | "packages"
  | "workspaces"
  | "notFound"
  // Wave 1 security
  | "passwordReset"
  | "emailVerification"
  | "createUserFromInvitation"
  | "ssoProcess"
  | "oauthCallback"
  // Wave 8 my account
  | "myProfile"
  | "myBasicSetting"
  | "myPassword"
  | "myAccessTokens"
  | "mySshKeys"
  | "myAvatar"
  // Wave 10 admin
  | "userList"
  | "newUser"
  | "invitationList"
  | "newInvitation"
  | "roleList"
  | "groupList"
  | "systemSetting"
  | "securitySetting"
  | "mailService"
  | "branding"
  | "agentList"
  | "agentOverview"
  | "agentBuilds"
  | "agentWorkspaces"
  | "agentLog"
  | "jobExecutors"
  | "issueFieldList"
  | "issueStateList"
  // Wave 11 help
  | "incompatibilities"
  | "resourceList"
  | "resourceDetail"
  // User pages
  | "userAuthorizations";

export type KnownProjectPage =
  // Wave 0
  | "dashboard"
  | "blob"
  // Wave 2 code
  | "commits"
  | "commitDetail"
  | "compare"
  | "branches"
  | "tags"
  | "codeComments"
  | "children"
  // Wave 3 issues
  | "issueList"
  | "newIssue"
  | "issueDetail"
  | "issueCommits"
  | "issuePulls"
  | "issueBuilds"
  | "boards"
  | "iterationList"
  | "newIteration"
  | "iterationDetail"
  | "iterationBurndown"
  | "iterationEdit"
  // Wave 4 PRs
  | "prList"
  | "newPullRequest"
  | "prActivities"
  | "prChanges"
  | "prCodeComments"
  | "prInvalid"
  | "pullRequestSetting"
  // Wave 5 builds
  | "buildList"
  | "buildDashboard"
  | "buildPipeline"
  | "buildLog"
  | "buildChanges"
  | "buildFixedIssues"
  | "buildArtifacts"
  | "buildReport"
  // Project settings
  | "generalSetting"
  | "avatarEdit"
  | "projectUserAuthorizations"
  // Workspaces
  | "projectWorkspaces"
  | "workspaceDashboard"
  | "workspaceChanges"
  | "workspaceLog"
  // Packages
  | "projectPacks"
  | "packDetail"
  | "buildPacks"
  // Statistics
  | "codeContribs"
  | "sourceLines"
  | "buildMetricStats";

export type RouteDefinition = {
  path: string;
  page: string;
  title: string;
  ref: string;
  layout: LayoutKind;
  known?: KnownPage;
};

export type ProjectRouteDefinition = {
  suffix: string;
  page: string;
  title: string;
  ref: string;
  known?: KnownProjectPage;
};

export type MatchedProjectRoute = {
  projectPath: string;
  def: ProjectRouteDefinition;
  params: Record<string, string>;
  blobSegments?: string[];
};
