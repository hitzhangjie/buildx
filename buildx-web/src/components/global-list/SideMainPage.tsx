import type { ReactNode } from "react";
import { Layout } from "../../layout/Layout";
import { SavedQueriesSide } from "./SavedQueriesSide";

type SideMainPageProps = {
  title: string;
  children: ReactNode;
  /** IssueListPage wraps padding outside side-main; others use padding on side-main. */
  padding?: "inner" | "outer";
  beforeMain?: ReactNode;
};

export function SideMainPage({
  title,
  children,
  padding = "inner",
  beforeMain,
}: SideMainPageProps) {
  const sideMain = (
    <div className="side-main side-main-wrap">
      <SavedQueriesSide />
      <div className="main">{children}</div>
    </div>
  );

  return (
    <Layout title={title}>
      {padding === "outer" ? (
        <div className="p-2 p-sm-5">
          {beforeMain}
          {sideMain}
        </div>
      ) : (
        <div className="side-main side-main-wrap p-2 p-sm-5">
          <SavedQueriesSide />
          <div className="main">{children}</div>
        </div>
      )}
    </Layout>
  );
}
