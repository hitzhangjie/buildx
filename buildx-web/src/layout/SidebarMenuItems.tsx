import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { ProjectMenuItem } from "./projectSidebar";

export type SidebarMenuItemDef = {
  label: string;
  href?: string;
  icon?: string;
  children?: SidebarMenuItemDef[];
  isActive?: (pathname: string) => boolean;
};

function defaultIsActive(pathname: string, href: string): boolean {
  if (href === "/~projects") {
    return pathname === "/~projects" || pathname.startsWith("/~projects/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isItemActive(pathname: string, item: SidebarMenuItemDef): boolean {
  if (item.isActive) {
    return item.isActive(pathname);
  }
  if (item.children?.length) {
    return item.children.some((child) => isItemActive(pathname, child));
  }
  if (!item.href) {
    return false;
  }
  return defaultIsActive(pathname, item.href);
}

function MenuBullet({ nestLevel }: { nestLevel: number }) {
  const bulletClass = nestLevel % 2 === 0 ? "menu-bullet-line" : "menu-bullet-dot dot";
  return <span className={`menu-bullet ${bulletClass}`} />;
}

function MenuIcon({ icon }: { icon: string }) {
  return <img src={`/~icon/${icon}.svg`} alt="" className="icon menu-icon" width={20} height={20} />;
}

function SidebarMenuItemRow({
  item,
  nestLevel,
}: {
  item: SidebarMenuItemDef;
  nestLevel: number;
}) {
  const { pathname } = useLocation();
  const paddingLeft = 25 + 15 * (nestLevel - 1);
  const active = isItemActive(pathname, item);
  const hasChildren = Boolean(item.children?.length);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  if (hasChildren) {
    return (
      <div className="menu-item">
        <a
          href="#"
          className={`menu-link menu-toggle${active ? " active open" : open ? " open" : ""}`}
          style={{ paddingLeft }}
          onClick={(e) => {
            e.preventDefault();
            setOpen((value) => !value);
          }}
        >
          {item.icon ? (
            <>
              <MenuIcon icon={item.icon} />
              <span className="menu-bullet" style={{ display: "none" }} />
            </>
          ) : (
            <>
              <span className="icon menu-icon" style={{ display: "none" }} />
              <MenuBullet nestLevel={nestLevel} />
            </>
          )}
          <span className="menu-text">
            <span>{item.label}</span>
          </span>
          <img src="/~icon/arrow.svg" alt="" className="icon menu-arrow" width={16} height={16} />
        </a>
        <div className="menu-body" style={open ? undefined : { display: "none" }}>
          {item.children!.map((child) => (
            <SidebarMenuItemRow key={child.label} item={child} nestLevel={nestLevel + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  const leafActive = item.isActive ? item.isActive(pathname) : defaultIsActive(pathname, item.href);

  return (
    <div className="menu-item">
      <Link
        className={`menu-link${leafActive ? " active" : ""}`}
        to={item.href}
        style={{ paddingLeft }}
      >
        {item.icon ? (
          <>
            <MenuIcon icon={item.icon} />
            <span className="menu-bullet" style={{ display: "none" }} />
          </>
        ) : (
          <>
            <span className="icon menu-icon" style={{ display: "none" }} />
            <MenuBullet nestLevel={nestLevel} />
          </>
        )}
        <span className="menu-text">
          <span>{item.label}</span>
        </span>
        <span className="icon menu-arrow" style={{ display: "none" }} />
      </Link>
    </div>
  );
}

export function SidebarMenuItems({ items }: { items: SidebarMenuItemDef[] }) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItemRow key={item.label} item={item} nestLevel={1} />
      ))}
    </>
  );
}

export function sidebarMenuFromProjectItems(
  items: ProjectMenuItem[],
  projectPath: string,
): SidebarMenuItemDef[] {
  const prefix = `/${projectPath}`;

  function mapItem(item: ProjectMenuItem): SidebarMenuItemDef {
    return {
      label: item.label,
      href: item.href,
      icon: item.icon,
      children: item.children?.map(mapItem),
      isActive: item.activeSuffix
        ? (pathname) => {
            if (!pathname.startsWith(prefix)) {
              return false;
            }
            const suffix = pathname.slice(prefix.length).replace(/\/+$/, "") || "";
            if (item.children?.length) {
              return item.children.some((child) => mapItem(child).isActive?.(pathname) ?? false);
            }
            const active = item.activeSuffix;
            return suffix === active || suffix.startsWith(`${active}/`);
          }
        : item.children
          ? (pathname) => item.children!.some((child) => mapItem(child).isActive?.(pathname) ?? false)
          : undefined,
    };
  }

  return items.map(mapItem);
}
