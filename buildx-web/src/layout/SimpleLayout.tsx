import type { ReactNode } from "react";

type SimpleLayoutProps = {
  title: string;
  subTitle?: string;
  icon?: string;
  children: ReactNode;
};

/** Mirrors OneDev SimplePage.html */
export function SimpleLayout({
  title,
  subTitle,
  icon = "/~icon/logo.svg",
  children,
}: SimpleLayoutProps) {
  return (
    <div className="SimplePage">
      <div className="main text-center">
        <div className="d-flex justify-content-center">
          <img src={icon} alt="" className="brand-logo" width={64} height={64} />
        </div>
        <div className="title">
          <h3>{title}</h3>
          {subTitle && <div className="text-muted font-weight-bold sub-title">{subTitle}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
