import type { SidebarMenuItemDef } from "./SidebarMenuItems";

const admin = (path: string) => `/~administration${path}`;

export function getAdministrationSidebarMenu(): SidebarMenuItemDef {
  return {
    label: "Administration",
    icon: "gear",
    isActive: (pathname) => pathname.startsWith("/~administration"),
    children: [
      { label: "System Settings", href: admin("/settings/system") },
      { label: "Security Settings", href: admin("/settings/security") },
      {
        label: "User Management",
        children: [
          { label: "Users", href: admin("/users") },
          { label: "Invitations", href: admin("/invitations") },
        ],
      },
      { label: "Role Management", href: admin("/roles") },
      { label: "Group Management", href: admin("/groups") },
      {
        label: "External Authentication",
        children: [
          { label: "Password Authenticator", href: admin("/settings/authenticator") },
          { label: "Single Sign On", href: admin("/settings/sso-providers") },
        ],
      },
      {
        label: "SSH & GPG Keys",
        children: [
          { label: "SSH Server Key", href: admin("/settings/ssh-server-key") },
          { label: "GPG Signing Key", href: admin("/settings/gpg-signing-key") },
          { label: "GPG Trusted Keys", href: admin("/settings/gpg-trusted-keys") },
        ],
      },
      {
        label: "Issue Settings",
        children: [
          { label: "Fields", href: admin("/settings/issue-fields") },
          { label: "States", href: admin("/settings/issue-states") },
          { label: "State Transitions", href: admin("/settings/state-transitions") },
          { label: "Default Boards", href: admin("/settings/issue-boards") },
          { label: "Links", href: admin("/settings/issue-links") },
          { label: "Time Tracking", href: admin("/settings/time-tracking") },
          { label: "Description Templates", href: admin("/settings/issue-templates") },
          { label: "Commit Message Fix Settings", href: admin("/settings/commit-message-fix") },
          { label: "External Issue Transformers", href: admin("/settings/external-issue-transformers") },
          { label: "Check Workflow Integrity", href: admin("/settings/check-issue-integrity") },
        ],
      },
      { label: "Job Executors", href: admin("/settings/job-executors") },
      { label: "Workspace Provisioners", href: admin("/settings/workspace-provisioners") },
      { label: "Agents", href: admin("/agents") },
      { label: "Mail Service", href: admin("/settings/mail-service") },
      { label: "Service Desk Settings", href: admin("/settings/service-desk-setting") },
      {
        label: "Email Templates",
        children: [
          { label: "Issue Notification", href: admin("/settings/email-templates/issue-notification") },
          { label: "Issue Notification Unsubscribed", href: admin("/settings/email-templates/issue-notification-unsubscribed") },
          { label: "Service Desk Issue Opened", href: admin("/settings/email-templates/service-desk-issue-opened") },
          { label: "Service Desk Issue Open Failed", href: admin("/settings/email-templates/service-desk-issue-open-failed") },
          { label: "Issue Stopwatch Overdue", href: admin("/settings/email-templates/stopwatch-overdue") },
          { label: "Pull Request Notification", href: admin("/settings/email-templates/pull-request-notification") },
          { label: "Pull Request Notification Unsubscribed", href: admin("/settings/email-templates/pull-request-notification-unsubscribed") },
          { label: "Build Notification", href: admin("/settings/email-templates/build-notification") },
          { label: "Package Notification", href: admin("/settings/email-templates/pack-notification") },
          { label: "Workspace Notification", href: admin("/settings/email-templates/workspace-notification") },
          { label: "Commit Notification", href: admin("/settings/email-templates/commit-notification") },
          { label: "User Invitation", href: admin("/settings/email-templates/user-invitation") },
          { label: "Email Verification", href: admin("/settings/email-templates/email-verification") },
          { label: "Password Reset", href: admin("/settings/email-templates/password-reset") },
          { label: "System Alert", href: admin("/settings/email-templates/alert") },
        ],
      },
      { label: "Alert Settings", href: admin("/settings/alert") },
      { label: "Label Management", href: admin("/labels") },
      { label: "Performance Settings", href: admin("/settings/performance") },
      { label: "Groovy Scripts", href: admin("/settings/groovy-scripts") },
      {
        label: "AI Settings",
        children: [
          { label: "Lite Model", href: admin("/settings/lite-ai-model") },
          { label: "Chat Preserve Days", href: admin("/settings/chat-preserve-days") },
        ],
      },
      { label: "Branding", href: admin("/settings/branding") },
      {
        label: "System Maintenance",
        children: [
          { label: "Database Backup", href: admin("/settings/backup") },
        ],
      },
    ],
  };
}
