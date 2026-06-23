import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/onedev/Icon";
import { consumeFlashMessage } from "../util/flash";
import { getGlobalSidebarMenu } from "./globalSidebar";
import { ProjectSidebarHeader } from "./ProjectSidebarHeader";
import { SidebarMenuItems } from "./SidebarMenuItems";
import "./layout-shell.css";

export type ProjectSidebarSection = {
  header: { label: string; avatarUrl?: string };
  menu: ReactNode;
};

type LayoutProps = {
  title?: string;
  children: ReactNode;
  topbarTitle?: ReactNode;
  projectSidebar?: ProjectSidebarSection;
};

export function Layout({
  title = "BuildX",
  children,
  topbarTitle,
  projectSidebar,
}: LayoutProps) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [dark, setDark] = useState(false);
  const [sidebarDocked, setSidebarDocked] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("buildx-dark-mode");
    const enabled = stored === "true";
    setDark(enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  useEffect(() => {
    const flash = consumeFlashMessage();
    if (!flash) {
      return;
    }
    const el = document.getElementById("session-feedback");
    if (!el) {
      return;
    }
    el.textContent = flash;
    el.classList.add("warning");
    el.style.display = "block";
    const width = el.offsetWidth;
    el.style.left = `${Math.max(0, (window.innerWidth - width) / 2)}px`;
    const timer = window.setTimeout(() => {
      el.classList.remove("warning");
      el.textContent = "";
      el.style.display = "";
      el.style.left = "";
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [pathname]);

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
            <Icon name="expand3" className="icon" width={20} height={20} />
          </a>
        </div>
        <div className="sidebar-body">
          <div className="sidebar-menu">
            <div className="menu-body">
              <SidebarMenuItems items={getGlobalSidebarMenu()} />
            </div>
          </div>
          {projectSidebar ? (
            <div className="sidebar-menu">
              <ProjectSidebarHeader
                label={projectSidebar.header.label}
                avatarUrl={projectSidebar.header.avatarUrl}
              />
              <div className="menu-body">{projectSidebar.menu}</div>
            </div>
          ) : null}
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
          <div className="topbar-title">
            {topbarTitle ?? title}
          </div>
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
            <Icon
              name={dark ? "sun" : "moon"}
              className="icon"
              width={16}
              height={16}
            />
          </a>
          {user ? (
            <div className="dropdown user-info d-inline-block">
              <a href="#" className="dropdown-toggle user-info no-dropdown-caret topbar-link">
                <Icon name="user" className="icon" width={16} height={16} />
                <span className="ml-1 d-none d-lg-inline">{user.fullName || user.name}</span>
              </a>
              <div className="dropdown-menu dropdown-menu-right">
                <Link to="/~my" className="dropdown-item">
                  <Icon name="profile" className="icon mr-2" width={16} height={16} />
                  Profile
                </Link>
                <Link to="/~logout" className="dropdown-item">
                  <Icon name="logout" className="icon mr-2" width={16} height={16} />
                  Sign Out
                </Link>
              </div>
            </div>
          ) : (
            <Link to="/~login" className="topbar-link sign-in">
              <Icon name="login" className="icon" width={16} height={16} />
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
