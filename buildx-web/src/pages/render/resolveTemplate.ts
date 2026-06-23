import type { PageTemplate } from "./types";

const LOG_PAGES = new Set([
  "BuildLogPage",
  "AgentLogPage",
  "WorkspaceLogPage",
  "ServerLogPage",
]);

const DETAIL_PAGES = /Detail|Dashboard|Activities|Changes|Pipeline|Artifacts|Fixed|Report|Packs|Overview|Profile|Burndown|Edit|Invalid|PackDetail|WorkspaceDashboard|BuildDashboard|PullRequestActivities|PullRequestChanges|PullRequestCodeComments|IssueDetail|IssueCommits|IssuePullRequests|IssueBuilds|IssueAuthorizations|IterationIssues|IterationBurndown|IterationEdit|CommitDetail|RoleDetail|GroupProfile|AgentOverview|AgentBuilds|AgentWorkspaces|SsoProviderDetail|MethodDetail|ResourceDetail/;

const SETTING_PAGES = /Setting|Protections|Management|Config|Connector|Authenticator|Spec|WebHooks|Preservation|Properties|Secrets|Prefix|Transitions|Templates|Transformers|Integrity|Provisioners|Executors|Scripts|Backup|Alert|Performance|Model|Preserve|Signing|Trusted|Authorizations|Avatar|General|ServiceDesk|Ai|Label|Groovy|LiteModel|ChatPreserve|DatabaseBackup|MailConnector|Branding|SecuritySetting|SystemSetting|CheckIssue|ExternalIssue|CommitMessage|TimeTracking|LinkSpec|DefaultBoard|IssueField|IssueState|StateTransition|JobExecutor|WorkspaceProvisioner|SshServer|GpgSigning|GpgTrusted|ContributedProjectSetting|ContributedAdministrationSetting/;

export function resolvePageTemplate(page: string): PageTemplate {
  if (page.startsWith("My")) {
    return "account-form";
  }
  if (page.startsWith("User") && page !== "UserListPage") {
    return "account-form";
  }
  if (page === "UserListPage") {
    return "admin-list";
  }

  if (LOG_PAGES.has(page)) {
    return "log-viewer";
  }
  if (page.includes("Terminal")) {
    return "terminal";
  }
  if (page.includes("Board")) {
    return "board";
  }
  if (page === "RevisionComparePage") {
    return "compare";
  }
  if (/Stats|Contribs|Lines|Metric|Burndown/.test(page)) {
    return "stats";
  }
  if (/ResourceListPage|ResourceDetailPage|MethodDetailPage/.test(page)) {
    return "help-api";
  }
  if (/TemplatePage$/.test(page)) {
    return "admin-email-template";
  }
  if (page === "NoProjectStoragePage" || page.startsWith("Invalid")) {
    return "simple-status";
  }
  if (page.startsWith("New")) {
    if (/NewUser|NewRole|NewGroup|NewInvitation|NewSso/.test(page)) {
      return "admin-form";
    }
    if (/NewIssue|NewIteration|NewPull/.test(page)) {
      return "project-form";
    }
    return "global-form";
  }
  if (page.endsWith("ListPage")) {
    if (page.startsWith("My") || page.startsWith("User") && page.includes("Page")) {
      return "account-form";
    }
    if (page.startsWith("Project") || page.includes("Project")) {
      return "project-list";
    }
    if (page.startsWith("Agent") || page.includes("admin") || /UserList|RoleList|GroupList|Invitation|Label|Agent|SsoProvider|IssueField|IssueState|StateTransition|DefaultBoard|LinkSpec|IssueTemplate|GroovyScript/.test(page)) {
      return "admin-list";
    }
    return "global-list";
  }
  if (DETAIL_PAGES.test(page)) {
    return "project-detail";
  }
  if (SETTING_PAGES.test(page)) {
    if (page.startsWith("My") || /^User/.test(page)) {
      return "account-form";
    }
    if (page.includes("admin") || page.startsWith("System") || page.startsWith("Security") || page.startsWith("Branding") || page.startsWith("Mail") || page.startsWith("Alert") || page.startsWith("Performance") || page.startsWith("Lite") || page.startsWith("Chat") || page.startsWith("Database") || page.startsWith("Authenticator") || page.startsWith("Sso") || page.startsWith("Ssh") || page.startsWith("Gpg") || page.startsWith("Job") || page.startsWith("WorkspaceProvisioner") || page.startsWith("Groovy") || page.startsWith("Issue") || page.startsWith("State") || page.startsWith("Default") || page.startsWith("Link") || page.startsWith("Time") || page.startsWith("CommitMessage") || page.startsWith("External") || page.startsWith("Check") || page.startsWith("ContributedAdministration")) {
      return page.endsWith("ListPage") ? "admin-list" : "admin-form";
    }
    return "project-setting";
  }
  if (/PasswordReset|EmailAddressVerification|CreateUserFromInvitation|SsoProcess|OAuthCallback|SignUp/.test(page)) {
    return "simple-form";
  }
  if (page === "ProjectImportPage" || page === "IssueImportPage") {
    return "global-form";
  }
  if (page === "IncompatibilitiesPage" || page === "TestPage" || page === "ServerInformationPage") {
    return "generic-card";
  }
  return "generic-card";
}
