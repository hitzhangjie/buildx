import { useState, useRef, useEffect, useLayoutEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./DropdownMenu.css";

/**
 * Floating dropdown panel — matches OneDev's FloatingPanel / dropdown-menu.
 * Renders via portal to document.body to avoid clipping by parent overflow.
 * Anchors below the trigger element by default; set dropup=true to open above.
 * Closes on outside click (mousedown anywhere outside both the menu and the trigger).
 *
 * When align="right", the panel's right edge aligns with the trigger's right edge.
 */
export function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  align = "left",
  dropup = false,
  panelClassName,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
  /** Open the menu above the trigger instead of below. */
  dropup?: boolean;
  /** Extra class on the floating panel root (e.g. OneDev's `get-code`). */
  panelClassName?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 8;
    const menuWidth = menuRef.current?.offsetWidth ?? 0;

    // Prefer requested alignment, then clamp to viewport to prevent truncation.
    const preferredLeft = align === "right" && menuWidth > 0 ? rect.right - menuWidth : rect.left;
    const maxLeft = menuWidth > 0
      ? Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding)
      : Math.max(viewportPadding, window.innerWidth - viewportPadding);
    const clampedLeft = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft);

    if (dropup) {
      // Leave at least 16px from viewport top; inner content handles scrolling.
      const maxHeight = Math.max(100, rect.top - 24);
      setMenuStyle({
        bottom: window.innerHeight - rect.top + 4, // 4px gap above trigger
        left: clampedLeft,
        top: "auto",
        maxHeight,
      });
    } else {
      setMenuStyle({
        top: rect.bottom + 4, // 4px gap below trigger
        left: clampedLeft,
        bottom: "auto",
      });
    }
  }, [triggerRef, align, dropup]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    const menu = menuRef.current;
    if (!menu) {
      return () => cancelAnimationFrame(frame);
    }
    const obs = new ResizeObserver(() => updatePosition());
    obs.observe(menu);
    return () => {
      cancelAnimationFrame(frame);
      obs.disconnect();
    };
  }, [isOpen, updatePosition, children]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 1050,
    right: "auto",
    float: "none",
    ...menuStyle,
  };

  const panelClass = ["floating", "dropdown-menu", "show", panelClassName].filter(Boolean).join(" ");

  return createPortal(
    <div ref={menuRef} className={panelClass} style={style}>
      <div className="dropdown-menu-content">{children}</div>
    </div>,
    document.body,
  );
}

/**
 * Self-contained dropdown trigger + floating menu — matches OneDev's DropdownLink.
 * Renders a clickable anchor that toggles a DropdownMenu below it.
 */
export function InlineDropdown({
  label,
  className,
  wrapperClassName,
  align = "left",
  dropup = false,
  variant = "default",
  title,
  disabled = false,
  children,
}: {
  label: ReactNode;
  className?: string;
  wrapperClassName?: string;
  align?: "left" | "right";
  /** Open the menu above the trigger instead of below. */
  dropup?: boolean;
  /** Render trigger as a direct sibling (no wrapper) for Bootstrap btn-group. */
  variant?: "default" | "btn-group";
  title?: string;
  disabled?: boolean;
  children: ReactNode | ((ctx: { close: () => void }) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const linkClass = className ?? "text-gray";
  const triggerClass = `${linkClass}${open ? " dropdown-open" : ""}`;
  const menuContent = typeof children === "function" ? children({ close }) : children;
  const wrapperClass = ["dropdown-aware", "d-inline-block", "position-relative", wrapperClassName]
    .filter(Boolean)
    .join(" ");

  if (disabled) {
    if (variant === "btn-group") {
      return (
        <span className={`${linkClass} opacity-50`} style={{ cursor: "not-allowed" }}>
          {label}
        </span>
      );
    }
    return (
      <span className={wrapperClass}>
        <span className="text-gray opacity-50" style={{ cursor: "not-allowed" }}>
          {label}
        </span>
      </span>
    );
  }

  const trigger = (
    <a
      ref={triggerRef}
      className={triggerClass}
      href="#"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        setOpen(!open);
      }}
      role="button"
    >
      {label}
    </a>
  );

  const menu = (
    <DropdownMenu isOpen={open} onClose={close} triggerRef={triggerRef} align={align} dropup={dropup}>
      {menuContent}
    </DropdownMenu>
  );

  if (variant === "btn-group") {
    return (
      <>
        {trigger}
        {menu}
      </>
    );
  }

  return (
    <span className={wrapperClass}>
      {trigger}
      {menu}
    </span>
  );
}
