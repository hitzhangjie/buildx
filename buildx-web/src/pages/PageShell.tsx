import { Layout } from "../layout/Layout";
import type { LayoutKind } from "../routes/types";

type PageShellProps = {
  title: string;
  page: string;
  refPath: string;
  layout?: LayoutKind;
  projectPath?: string;
};

export function PageShell({
  title,
  page,
  refPath,
  layout = "main",
  projectPath,
}: PageShellProps) {
  const body = (
    <div className="page-content">
      <div className="card card-custom">
        <div className="card-body text-center py-10">
          <img src="/~icon/wand.svg" alt="" className="mb-5 opacity-50" width={48} height={48} />
          <h5 className="font-weight-bold mb-2">{title}</h5>
          <p className="text-muted mb-4">
            <code>{page}</code> — UI migration in progress
          </p>
          {projectPath && (
            <p className="text-muted font-size-sm mb-2">
              Project: <code>{projectPath}</code>
            </p>
          )}
          <p className="text-muted font-size-sm mb-0">
            OneDev reference: <code>{refPath}</code>
          </p>
        </div>
      </div>
    </div>
  );

  if (layout === "simple") {
    return body;
  }

  return <Layout title={title}>{body}</Layout>;
}
