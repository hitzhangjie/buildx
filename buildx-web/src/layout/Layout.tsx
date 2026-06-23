import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./layout-shell.css";

type LayoutProps = {
  title?: string;
  children: ReactNode;
};

const GLOBAL_NAV = [
  { href: "/~projects", label: "Projects", icon: "project" },
  { href: "/~issues", label: "Issues", icon: "bug" },
  { href: "/~pulls", label: "Pull Requests", icon: "pull-request" },
  { href: "/~builds", label: "Builds", icon: "play-circle" },
  { href: "/~packages", label: "Packages", icon: "package" },
  { href: "/~workspaces", label: "Workspaces", icon: "workspace" },
] as const;

export function Layout({ title = "BuildX", children }: LayoutProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
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

  function isActive(href: string): boolean {
    if (href === "/~projects") {
      return pathname === "/~projects" || pathname.startsWith("/~projects/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={`LayoutPage${dark ? " dark-mode" : ""}`}>
      <div id="session-feedback" className="session-feedback" aria-live="polite" />
      <div id="ajax-loading-indicator" className="ajax-loading-indicator d-none" />

      <div className={`sidebar${sidebarDocked ? " sidebar-docked" : ""}`}>
        <div className="sidebar-header">
          <Link className="sidebar-brand" to="/~projects">
            <img
              src="/~img/logo.png"
              alt=""
              width={30}
              height={30}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <img src="/~icon/logo.svg" alt="" width={30} height={30} className="mr-3" />
            BuildX
          </Link>
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
              {GLOBAL_NAV.map((item) => (
                <Link
                  key={item.href}
                  className={`menu-item${isActive(item.href) ? " active" : ""}`}
                  to={item.href}
                >
                  <img
                    src={`/~icon/${item.icon}.svg`}
                    alt=""
                    className="icon mr-3"
                    width={16}
                    height={16}
                  />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="sidebar-footer">
          <a href="/~help/api" className="sidebar-version" target="_blank" rel="noreferrer">
            API
          </a>
        </div>
      </div>

      <div className="topbar">
        <div className="topbar-left">
          <Link className="topbar-brand d-lg-none" to="/~projects">
            <img src="/~icon/logo.svg" alt="" width={30} height={30} />
          </Link>
          <div className="topbar-title">{title}</div>
        </div>
        <div className="topbar-right text-nowrap">
          <a
            href="#"
            className="topbar-link"
            title="Toggle dark mode"
            onClick={(e) => {
              e.preventDefault();
              toggleDark();
            }}
          >
            <img
              src={dark ? "/~icon/sun.svg" : "/~icon/moon.svg"}
              alt=""
              className="icon"
              width={16}
              height={16}
            />
          </a>
          {user ? (
            <div className="dropdown user-info d-inline-block">
              <a href="#" className="dropdown-toggle user-info no-dropdown-caret topbar-link">
                <img src="/~icon/user.svg" alt="" className="icon" width={16} height={16} />
                <span className="ml-1 d-none d-lg-inline">{user.fullName || user.name}</span>
              </a>
              <div className="dropdown-menu dropdown-menu-right">
                <Link to="/~my" className="dropdown-item">
                  <img src="/~icon/profile.svg" alt="" className="icon mr-2" width={16} height={16} />
                  Profile
                </Link>
                <a
                  href="#"
                  className="dropdown-item"
                  onClick={(e) => {
                    e.preventDefault();
                    logout();
                  }}
                >
                  <img src="/~icon/logout.svg" alt="" className="icon mr-2" width={16} height={16} />
                  Sign Out
                </a>
              </div>
            </div>
          ) : (
            <Link to="/~login" className="topbar-link sign-in">
              <img src="/~icon/login.svg" alt="" className="icon" width={16} height={16} />
              <span className="d-none d-sm-inline ml-1">Sign In</span>
            </Link>
          )}
        </div>
      </div>

      <div className={`main autofit d-flex flex-column resize-aware${sidebarDocked ? " sidebar-docked" : ""}`}>
        {children}
      </div>
    </div>
  );
}
