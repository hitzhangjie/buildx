import type { ReactNode } from "react";
import { BrandLogo } from "../components/onedev/BrandLogo";

type SimpleLayoutProps = {
  title: string;
  subTitle?: string | null;
  logoSrc?: string;
  children: ReactNode;
};

/**
 * Mirrors OneDev SimplePage.html + wicket:child slot.
 * Page-specific footers (e.g. LoginPage "Powered by") belong in the child content.
 */
export function SimpleLayout({ title, subTitle, logoSrc, children }: SimpleLayoutProps) {
  return (
    <div className="main text-center">
      <div className="d-flex justify-content-center">
        {logoSrc ? (
          <img src={logoSrc} alt="" className="brand-logo" width={100} height={100} />
        ) : (
          <BrandLogo />
        )}
      </div>
      <div className="title">
        <h3>{title}</h3>
        {subTitle ? (
          <div className="text-muted font-weight-bold sub-title">{subTitle}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
