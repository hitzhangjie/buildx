import { type ReactNode, useEffect, useState } from "react";
import "./layout-shell.css";

type LayoutProps = {
  title?: string;
  children: ReactNode;
};

export function Layout({ title = "BuildX", children }: LayoutProps) {
  const [dark, setDark] = useState(false);
  const [sidebarDocked, setSidebarDocked] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("buildx-dark-mode");
    const enabled = stored === "true";
    setDark(enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  function toggleDark() {
    setDark((prev) => {
      const next = !prev;
      localStorage.setItem("buildx-dark-mode", String(next));
      document.documentElement.classList.toggle("dark-mode", next);
      return next;
    });
  }

  return (
    <div className={`LayoutPage${dark ? " dark-mode" : ""}`}>
      <div className={`sidebar${sidebarDocked ? " sidebar-docked" : ""}`}>
        <div className="sidebar-header">
          <a className="sidebar-brand" href="/">
            <img src="/~img/logo.png" alt="" width={30} height={30} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <img src="/~icon/logo.svg" alt="" width={30} height={30} className="mr-3" />
            BuildX
          </a>
          <a
            href="#"
            className="sidebar-mini-toggle d-none d-lg-inline"
            onClick={(e) => {
              e.preventDefault();
              setSidebarDocked((v) => !v);
            }}
          >
            <img src="/~icon/expand3.svg" alt="" className="icon" width={20} height={20} />
          </a>
        </div>
        <div className="sidebar-body">
          <div className="sidebar-menu">
            <div className="menu-body">
              <a className="menu-item active" href="/">
                <img src="/~icon/project.svg" alt="" className="icon mr-3" width={16} height={16} />
                Projects
              </a>
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <a href="/~api/v1/info" className="sidebar-version" target="_blank" rel="noreferrer">
            API
          </a>
        </div>
      </div>

      <div className="topbar">
        <div className="topbar-left">
          <a className="topbar-brand d-lg-none" href="/">
            <img src="/~icon/logo.svg" alt="" width={30} height={30} />
          </a>
          <div className="topbar-title">{title}</div>
        </div>
        <div className="topbar-right text-nowrap">
          <a href="#" className="topbar-link" title="Toggle dark mode" onClick={(e) => { e.preventDefault(); toggleDark(); }}>
            <img src={dark ? "/~icon/sun.svg" : "/~icon/moon.svg"} alt="" className="icon" width={16} height={16} />
          </a>
          <a href="/login" className="topbar-link sign-in">
            <img src="/~icon/login.svg" alt="" className="icon" width={16} height={16} />
            <span className="d-none d-sm-inline ml-1">Sign In</span>
          </a>
        </div>
      </div>

      <div className={`main${sidebarDocked ? " sidebar-docked" : ""}`}>{children}</div>
    </div>
  );
}
