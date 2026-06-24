import { Navigate, Route, Routes, matchPath, useLocation } from "react-router-dom";
import { ProjectProvider } from "../context/ProjectContext";
import { GLOBAL_ROUTES } from "./globalRoutes";
import { matchProjectRoute } from "./matchProjectRoute";
import { RequireLayoutAccess } from "./RequireLayoutAccess";

// --- Global page imports ---
import { BuildsPage } from "../pages/BuildsPage";
import { IssuesPage } from "../pages/IssuesPage";
import { LoginPage } from "../pages/security/LoginPage";
import { LogoutPage } from "../pages/LogoutPage";
import { PackagesPage } from "../pages/PackagesPage";
import { PageNotFoundPage } from "../pages/PageNotFoundPage";
import { PullRequestsPage } from "../pages/PullRequestsPage";
import { ServerInitPage } from "../pages/ServerInitPage";
import { SignUpPage } from "../pages/security/SignUpPage";
import { WorkspacesPage } from "../pages/WorkspacesPage";

// --- Wave 1 security ---
import { PasswordResetPage } from "../pages/security/PasswordResetPage";
import { EmailAddressVerificationPage } from "../pages/security/EmailAddressVerificationPage";
import { CreateUserFromInvitationPage } from "../pages/security/CreateUserFromInvitationPage";
import { SsoProcessPage } from "../pages/security/SsoProcessPage";
import { OAuthCallbackPage } from "../pages/security/OAuthCallbackPage";

// --- Wave 1 project pages ---
import { ProjectsPage } from "../pages/project/ProjectListPage";
import { NewProjectPage } from "../pages/project/NewProjectPage";

// --- Wave 2 project code pages ---
import { ProjectBlobPage } from "../pages/ProjectBlobPage";
import { ProjectDashboardPage } from "../pages/ProjectDashboardPage";
import { ProjectCommitsPage } from "../pages/project/ProjectCommitsPage";
import { CommitDetailPage } from "../pages/project/CommitDetailPage";
import { RevisionComparePage } from "../pages/project/RevisionComparePage";
import { ProjectBranchesPage } from "../pages/project/ProjectBranchesPage";
import { ProjectTagsPage } from "../pages/project/ProjectTagsPage";
import { ProjectCodeCommentsPage } from "../pages/project/ProjectCodeCommentsPage";
import { ProjectChildrenPage } from "../pages/project/ProjectChildrenPage";

// --- Wave 3 project issue pages ---
import { ProjectIssueListPage } from "../pages/project/issues/ProjectIssueListPage";
import { NewIssuePage } from "../pages/project/issues/NewIssuePage";
import { IssueDetailPage } from "../pages/project/issues/IssueDetailPage";
import { IssueBoardsPage } from "../pages/project/issues/IssueBoardsPage";
import { IterationListPage } from "../pages/project/issues/IterationListPage";
import { NewIterationPage } from "../pages/project/issues/NewIterationPage";
import { IterationIssuesPage } from "../pages/project/issues/IterationIssuesPage";
import { IterationBurndownPage } from "../pages/project/issues/IterationBurndownPage";
import { IterationEditPage } from "../pages/project/issues/IterationEditPage";
import { IssueCommitsPage } from "../pages/project/issues/IssueCommitsPage";
import { IssuePullRequestsPage } from "../pages/project/issues/IssuePullRequestsPage";
import { IssueBuildsPage } from "../pages/project/issues/IssueBuildsPage";

// --- Wave 4 project PR pages ---
import { ProjectPullRequestsPage } from "../pages/project/pullrequests/ProjectPullRequestsPage";
import { NewPullRequestPage } from "../pages/project/pullrequests/NewPullRequestPage";
import { PullRequestActivitiesPage } from "../pages/project/pullrequests/PullRequestActivitiesPage";
import { PullRequestChangesPage } from "../pages/project/pullrequests/PullRequestChangesPage";
import { PullRequestCodeCommentsPage } from "../pages/project/pullrequests/PullRequestCodeCommentsPage";
import { InvalidPullRequestPage } from "../pages/project/pullrequests/InvalidPullRequestPage";
import { PullRequestSettingPage } from "../pages/project/settings/PullRequestSettingPage";

// --- Wave 5 project build pages ---
import { ProjectBuildsPage } from "../pages/project/builds/ProjectBuildsPage";
import { BuildDashboardPage } from "../pages/project/builds/BuildDashboardPage";
import { BuildPipelinePage } from "../pages/project/builds/BuildPipelinePage";
import { BuildLogPage } from "../pages/project/builds/BuildLogPage";
import { BuildChangesPage } from "../pages/project/builds/BuildChangesPage";
import { BuildArtifactsPage } from "../pages/project/builds/BuildArtifactsPage";
import { FixedIssuesPage } from "../pages/project/builds/FixedIssuesPage";

// --- Wave 8 my pages ---
import { MyProfilePage } from "../pages/my/MyProfilePage";
import { MyBasicSettingPage } from "../pages/my/MyBasicSettingPage";
import { MyPasswordPage } from "../pages/my/MyPasswordPage";
import { MyAccessTokensPage } from "../pages/my/MyAccessTokensPage";
import { MySshKeysPage } from "../pages/my/MySshKeysPage";
import { MyAvatarPage } from "../pages/my/MyAvatarPage";

// --- Wave 10 admin pages ---
import { UserListPage } from "../pages/admin/UserListPage";
import { NewUserPage } from "../pages/admin/NewUserPage";
import { InvitationListPage } from "../pages/admin/InvitationListPage";
import { NewInvitationPage } from "../pages/admin/NewInvitationPage";
import { RoleListPage } from "../pages/admin/RoleListPage";
import { GroupListPage } from "../pages/admin/GroupListPage";
import { SystemSettingPage } from "../pages/admin/SystemSettingPage";
import { SecuritySettingPage } from "../pages/admin/SecuritySettingPage";
import { MailConnectorPage } from "../pages/admin/MailConnectorPage";
import { BrandingSettingPage } from "../pages/admin/BrandingSettingPage";
import { AgentListPage } from "../pages/admin/AgentListPage";
import { IssueFieldListPage } from "../pages/admin/IssueFieldListPage";
import { IssueStateListPage } from "../pages/admin/IssueStateListPage";

// --- Wave 11 help pages ---
import { IncompatibilitiesPage } from "../pages/help/IncompatibilitiesPage";
import { ResourceListPage } from "../pages/help/ResourceListPage";
import { ResourceDetailPage } from "../pages/help/ResourceDetailPage";

import { PageRenderer } from "../pages/render/PageRenderer";
import type { RouteDefinition } from "./types";

// --- Component maps ---

/** Global routes that have dedicated components. */
const GLOBAL_KNOWN: Partial<Record<NonNullable<RouteDefinition["known"]>, () => React.ReactNode>> = {
  // Wave 0/1 core
  projects: () => <ProjectsPage />,
  login: () => <LoginPage />,
  logout: () => <LogoutPage />,
  signup: () => <SignUpPage />,
  serverInit: () => <ServerInitPage />,
  newProject: () => <NewProjectPage />,
  issues: () => <IssuesPage />,
  pulls: () => <PullRequestsPage />,
  builds: () => <BuildsPage />,
  packages: () => <PackagesPage />,
  workspaces: () => <WorkspacesPage />,
  notFound: () => <PageNotFoundPage />,

  // Wave 1 security
  passwordReset: () => <PasswordResetPage />,
  emailVerification: () => <EmailAddressVerificationPage />,
  createUserFromInvitation: () => <CreateUserFromInvitationPage />,
  ssoProcess: () => <SsoProcessPage />,
  oauthCallback: () => <OAuthCallbackPage />,

  // Wave 8 my account
  myProfile: () => <MyProfilePage />,
  myBasicSetting: () => <MyBasicSettingPage />,
  myPassword: () => <MyPasswordPage />,
  myAccessTokens: () => <MyAccessTokensPage />,
  mySshKeys: () => <MySshKeysPage />,
  myAvatar: () => <MyAvatarPage />,

  // Wave 10 admin
  userList: () => <UserListPage />,
  newUser: () => <NewUserPage />,
  invitationList: () => <InvitationListPage />,
  newInvitation: () => <NewInvitationPage />,
  roleList: () => <RoleListPage />,
  groupList: () => <GroupListPage />,
  systemSetting: () => <SystemSettingPage />,
  securitySetting: () => <SecuritySettingPage />,
  mailService: () => <MailConnectorPage />,
  branding: () => <BrandingSettingPage />,
  agentList: () => <AgentListPage />,
  issueFieldList: () => <IssueFieldListPage />,
  issueStateList: () => <IssueStateListPage />,

  // Wave 11 help
  incompatibilities: () => <IncompatibilitiesPage />,
  resourceList: () => <ResourceListPage />,
  resourceDetail: () => <ResourceDetailPage />,
};

/**
 * Project routes that have dedicated components.
 * Key is the project route "known" value.
 */
const PROJECT_KNOWN: Partial<Record<NonNullable<import("./types").ProjectRouteDefinition["known"]>, () => React.ReactNode>> = {
  dashboard: () => <ProjectDashboardPage />,
  blob: () => <ProjectBlobPage />,

  // Wave 2 code
  commits: () => <ProjectCommitsPage />,
  commitDetail: () => <CommitDetailPage />,
  compare: () => <RevisionComparePage />,
  branches: () => <ProjectBranchesPage />,
  tags: () => <ProjectTagsPage />,
  codeComments: () => <ProjectCodeCommentsPage />,
  children: () => <ProjectChildrenPage />,

  // Wave 3 issues
  issueList: () => <ProjectIssueListPage />,
  newIssue: () => <NewIssuePage />,
  issueDetail: () => <IssueDetailPage />,
  issueCommits: () => <IssueCommitsPage />,
  issuePulls: () => <IssuePullRequestsPage />,
  issueBuilds: () => <IssueBuildsPage />,
  boards: () => <IssueBoardsPage />,
  iterationList: () => <IterationListPage />,
  newIteration: () => <NewIterationPage />,
  iterationDetail: () => <IterationIssuesPage />,
  iterationBurndown: () => <IterationBurndownPage />,
  iterationEdit: () => <IterationEditPage />,

  // Wave 4 PRs
  prList: () => <ProjectPullRequestsPage />,
  newPullRequest: () => <NewPullRequestPage />,
  prActivities: () => <PullRequestActivitiesPage />,
  prChanges: () => <PullRequestChangesPage />,
  prCodeComments: () => <PullRequestCodeCommentsPage />,
  prInvalid: () => <InvalidPullRequestPage />,
  pullRequestSetting: () => <PullRequestSettingPage />,

  // Wave 5 builds
  buildList: () => <ProjectBuildsPage />,
  buildDashboard: () => <BuildDashboardPage />,
  buildPipeline: () => <BuildPipelinePage />,
  buildLog: () => <BuildLogPage />,
  buildChanges: () => <BuildChangesPage />,
  buildFixedIssues: () => <FixedIssuesPage />,
  buildArtifacts: () => <BuildArtifactsPage />,
};

function GlobalRouteElement({ def }: { def: RouteDefinition }) {
  const { pathname } = useLocation();
  const matched = matchPath(def.path, pathname);
  const params = (matched?.params ?? {}) as Record<string, string>;

  let content: React.ReactNode;
  if (def.known && GLOBAL_KNOWN[def.known]) {
    content = GLOBAL_KNOWN[def.known]!();
  } else {
    content = (
      <PageRenderer
        title={def.title}
        page={def.page}
        refPath={def.ref}
        layout={def.layout}
        params={params}
      />
    );
  }

  if (def.layout === "simple") {
    return <>{content}</>;
  }
  return <RequireLayoutAccess>{content}</RequireLayoutAccess>;
}

function ProjectRouteElement() {
  const { pathname } = useLocation();
  const matched = matchProjectRoute(pathname);

  if (!matched) {
    return <PageNotFoundPage />;
  }

  let content: React.ReactNode;
  if (matched.def.known && PROJECT_KNOWN[matched.def.known]) {
    content = PROJECT_KNOWN[matched.def.known]!();
  } else {
    content = (
      <PageRenderer
        title={matched.def.title}
        page={matched.def.page}
        refPath={matched.def.ref}
        layout="main"
        projectPath={matched.projectPath}
        params={matched.params}
      />
    );
  }

  return <RequireLayoutAccess>{content}</RequireLayoutAccess>;
}

function LegacyProjectRedirect() {
  const { pathname } = useLocation();
  const rest = pathname.replace(/^\/projects\//, "");
  return <Navigate to={`/${rest}`} replace />;
}

export function AppRouter() {
  return (
    <ProjectProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/~projects" replace />} />
        {GLOBAL_ROUTES.map((def) => (
          <Route key={def.path} path={def.path} element={<GlobalRouteElement def={def} />} />
        ))}
        <Route path="/projects/*" element={<LegacyProjectRedirect />} />
        <Route path="/*" element={<ProjectRouteElement />} />
      </Routes>
    </ProjectProvider>
  );
}
