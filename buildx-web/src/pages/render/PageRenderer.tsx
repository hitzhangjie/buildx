import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { EmptyListState } from "../../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../../components/global-list/ResourceListPanel";
import { SideMainPage } from "../../components/global-list/SideMainPage";
import { Layout } from "../../layout/Layout";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { SimpleLayout } from "../../layout/SimpleLayout";
import { detailTabsForPage, mockRowsForPage } from "./mockEntity";
import { SettingsLayout } from "../../components/onedev/SettingsLayout";
import { resolvePageTemplate } from "./resolveTemplate";
import type { PageRenderContext, PageTemplate } from "./types";

type TemplateProps = PageRenderContext & { template: PageTemplate };

function ListTable({ rows }: { rows: ReturnType<typeof mockRowsForPage> }) {
  if (!rows.length) {
    return <EmptyListState />;
  }
  return (
    <table className="table table-hover mb-0">
      <thead>
        <tr>
          <th>Name</th>
          <th>Status</th>
          <th>Info</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.href ? <Link to={row.href}>{row.primary}</Link> : row.primary}</td>
            <td className="text-muted">{row.secondary}</td>
            <td className="text-muted font-size-sm">{row.meta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FormCard({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="card card-custom m-2 m-sm-5">
      <div className="card-body">
        <h5 className="font-weight-bold mb-4">{title}</h5>
        {fields.map((field) => (
          <div className="form-group" key={field}>
            <label className="font-weight-bold font-size-sm">{field}</label>
            <input className="form-control" placeholder={field} readOnly />
          </div>
        ))}
        <button type="button" className="btn btn-primary" disabled>
          Save
        </button>
      </div>
    </div>
  );
}

function DetailTabs({
  tabs,
  children,
}: {
  tabs: { label: string; href: string; active: boolean }[];
  children: ReactNode;
}) {
  return (
    <>
      <ul className="nav nav-tabs nav-tabs-line nav-tabs-line-2x px-3 pt-3">
        {tabs.map((tab) => (
          <li className="nav-item" key={tab.href}>
            <Link className={`nav-link${tab.active ? " active" : ""}`} to={tab.href}>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="p-3">{children}</div>
    </>
  );
}

function LogViewer({ title }: { title: string }) {
  return (
    <div
      className="terminal bg-dark text-light p-3 m-3 font-size-sm"
      style={{ minHeight: 320, fontFamily: "monospace" }}
    >
      <div className="text-muted mb-2"># {title} (mock log output)</div>
      <div>[2026-06-23 10:00:01] Job started</div>
      <div>[2026-06-23 10:00:02] Cloning repository...</div>
      <div>[2026-06-23 10:00:05] Running build step</div>
      <div>[2026-06-23 10:00:12] Build finished successfully</div>
    </div>
  );
}

function PageBody(props: TemplateProps) {
  const { template, title, page, projectPath, params, refPath, layout } = props;
  const rows = mockRowsForPage(page, projectPath, params);

  switch (template) {
    case "simple-form":
      return (
        <SimpleLayout title={title} subTitle={`${page} — stub form`}>
          <div className="content mx-auto text-left" style={{ maxWidth: 420 }}>
            <FormCard title={title} fields={["Email", "Password", "Confirm Password"]} />
          </div>
        </SimpleLayout>
      );

    case "simple-status":
      return (
        <SimpleLayout title={title}>
          <div className="alert alert-light-warning mx-auto" style={{ maxWidth: 480 }}>
            {title}
          </div>
        </SimpleLayout>
      );

    case "global-list":
      return (
        <SideMainPage title={title}>
          <ResourceListPanel
            cardClass="global-list"
            queryPlaceholder={`Query/order ${title.toLowerCase()}`}
            toolbarLinks={DEFAULT_QUERY_LINKS}
            count={rows.length}
          >
            <ListTable rows={rows} />
          </ResourceListPanel>
        </SideMainPage>
      );

    case "global-form":
    case "admin-form":
    case "account-form":
      return (
        <Layout title={title}>
          <FormCard title={title} fields={["Name", "Description", "Value"]} />
        </Layout>
      );

    case "admin-list":
      return (
        <Layout title={title}>
          <div className="card card-custom m-2 m-sm-5">
            <div className="card-body p-0">
              <ListTable rows={rows} />
            </div>
          </div>
        </Layout>
      );

    case "admin-email-template":
      return (
        <Layout title={title}>
          <FormCard title={title} fields={["Subject", "Body (HTML)", "Variables"]} />
        </Layout>
      );

    case "help-api":
      return (
        <Layout title={title}>
          <div className="card card-custom m-2 m-sm-5">
            <div className="card-body">
              <p className="text-muted">REST API documentation — stub renderer.</p>
              <code>{refPath}</code>
            </div>
          </div>
        </Layout>
      );

    case "project-list":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <ResourceListPanel
            cardClass="project-list"
            queryPlaceholder={`Query/order ${title.toLowerCase()}`}
            toolbarLinks={DEFAULT_QUERY_LINKS}
            count={rows.length}
          >
            <ListTable rows={rows} />
          </ResourceListPanel>
        </ProjectLayout>
      );

    case "project-form":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <FormCard title={title} fields={["Title", "Description", "Assignee"]} />
        </ProjectLayout>
      );

    case "project-detail":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <DetailTabs tabs={detailTabsForPage(page, projectPath, params)}>
            <ListTable rows={rows} />
          </DetailTabs>
        </ProjectLayout>
      );

    case "project-setting":
      if (!projectPath) {
        return null;
      }
      return (
        <SettingsLayout projectPath={projectPath} pageTitle={title}>
          <div className="card">
            <div className="card-body">
              <FormCard title={title} fields={["Setting name", "Value", "Description"]} />
            </div>
          </div>
        </SettingsLayout>
      );

    case "log-viewer":
      if (projectPath) {
        return (
          <ProjectLayout projectPath={projectPath} pageTitle={title}>
            <LogViewer title={title} />
          </ProjectLayout>
        );
      }
      return (
        <Layout title={title}>
          <LogViewer title={title} />
        </Layout>
      );

    case "terminal":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <div
            className="terminal bg-dark text-light m-3 p-2"
            style={{ minHeight: 400, fontFamily: "monospace" }}
          >
            $ workspace shell (xterm stub — connect WebSocket later)
          </div>
        </ProjectLayout>
      );

    case "compare":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <FormCard title="Compare Revisions" fields={["Base revision", "Target revision"]} />
        </ProjectLayout>
      );

    case "board":
      if (!projectPath) {
        return null;
      }
      return (
        <ProjectLayout projectPath={projectPath} pageTitle={title}>
          <div className="d-flex p-3 overflow-auto">
            {["Open", "In Progress", "Done"].map((col) => (
              <div key={col} className="card card-custom mr-3" style={{ minWidth: 260 }}>
                <div className="card-header font-weight-bold">{col}</div>
                <div className="card-body">
                  <div className="card mb-2">
                    <div className="card-body p-3 font-size-sm">#1 Sample issue</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ProjectLayout>
      );

    default:
      if (projectPath) {
        return (
          <ProjectLayout projectPath={projectPath} pageTitle={title}>
            <div className="card card-custom m-3">
              <div className="card-body">
                <h5 className="font-weight-bold">{title}</h5>
                <p className="text-muted mb-2">
                  <code>{page}</code>
                </p>
                <p className="text-muted font-size-sm mb-0">
                  Reference: <code>{refPath}</code>
                </p>
              </div>
            </div>
          </ProjectLayout>
        );
      }
      if (layout === "simple") {
        return (
          <SimpleLayout title={title}>
            <p className="text-muted">
              <code>{page}</code>
            </p>
          </SimpleLayout>
        );
      }
      return (
        <Layout title={title}>
          <div className="card card-custom m-3">
            <div className="card-body">
              <h5 className="font-weight-bold">{title}</h5>
              <p className="text-muted font-size-sm">
                Reference: <code>{refPath}</code>
              </p>
            </div>
          </div>
        </Layout>
      );
  }
}

export function PageRenderer(ctx: PageRenderContext) {
  const template = resolvePageTemplate(ctx.page);
  return <PageBody {...ctx} template={template} />;
}
