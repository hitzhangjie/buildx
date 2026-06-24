import type { ReactNode } from "react";
import { Layout } from "../../layout/Layout";
import { QueryListLayout } from "../onedev/panels/QueryListLayout";
import type { UseSavedQueriesOptions } from "../../hooks/useSavedQueries";
import type { useSavedQueries } from "../../hooks/useSavedQueries";

type SideMainPageProps = {
  title: string;
  children: ReactNode;
  /** IssueListPage wraps padding outside side-main; others use padding on side-main. */
  padding?: "inner" | "outer";
  beforeMain?: ReactNode;
  savedQueries?: UseSavedQueriesOptions;
};

type SavedQueriesRenderProps = {
  title: string;
  padding?: "inner" | "outer";
  beforeMain?: ReactNode;
  savedQueries: UseSavedQueriesOptions;
  children: (savedQueries: ReturnType<typeof useSavedQueries>) => ReactNode;
};

function renderPadding(
  padding: "inner" | "outer",
  beforeMain: ReactNode | undefined,
  content: ReactNode,
) {
  return padding === "outer" ? (
    <div className="p-2 p-sm-5">
      {beforeMain}
      {content}
    </div>
  ) : (
    <div className="p-2 p-sm-5">{content}</div>
  );
}

export function SideMainPage(props: SideMainPageProps): ReactNode;
export function SideMainPage(props: SavedQueriesRenderProps): ReactNode;
export function SideMainPage({
  title,
  children,
  padding = "inner",
  beforeMain,
  savedQueries,
}: SideMainPageProps | SavedQueriesRenderProps) {
  if (savedQueries) {
    const renderChild = children as (savedQueries: ReturnType<typeof useSavedQueries>) => ReactNode;
    const layout = (
      <QueryListLayout className="side-main side-main-wrap" {...savedQueries}>
        {(sq) => renderChild(sq)}
      </QueryListLayout>
    );
    return <Layout title={title}>{renderPadding(padding, beforeMain, layout)}</Layout>;
  }

  const layout = (
    <div className="side-main side-main-wrap">
      <div className="main">{children as ReactNode}</div>
    </div>
  );
  return <Layout title={title}>{renderPadding(padding, beforeMain, layout)}</Layout>;
}
