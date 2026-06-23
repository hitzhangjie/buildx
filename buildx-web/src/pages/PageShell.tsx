import { PageRenderer } from "./render/PageRenderer";
import type { LayoutKind } from "../routes/types";

type PageShellProps = {
  title: string;
  page: string;
  refPath: string;
  layout?: LayoutKind;
  projectPath?: string;
  params?: Record<string, string>;
};

/** @deprecated Use PageRenderer directly. Kept for compatibility. */
export function PageShell({
  title,
  page,
  refPath,
  layout = "main",
  projectPath,
  params = {},
}: PageShellProps) {
  return (
    <PageRenderer
      title={title}
      page={page}
      refPath={refPath}
      layout={layout}
      projectPath={projectPath}
      params={params}
    />
  );
}
