import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./DropdownMenu.css";

/**
 * Floating dropdown panel — matches OneDev's FloatingPanel / dropdown-menu.
 * Renders via portal to document.body to avoid clipping by parent overflow.
 * Anchors below the trigger element. Closes on outside click (mousedown
 * anywhere outside both the menu and the trigger).
 *
 * When align="right", the panel's right edge aligns with the trigger's right edge.
 */
export function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  align = "left",
  panelClassName,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
  /** Extra class on the floating panel root (e.g. OneDev's `get-code`). */
  panelClassName?: string;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const pos: { top: number; left?: number; right?: number } = {
      top: rect.bottom + 4, // 4px gap below trigger
    };
    if (align === "right") {
      pos.right = window.innerWidth - rect.right;
    } else {
      pos.left = rect.left;
    }
    setPosition(pos);
  }, [triggerRef, align]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
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
    top: position.top,
    float: "none",
  };
  if (align === "right") {
    style.right = position.right;
    style.left = "auto"; // override bootstrap .dropdown-menu { left: 0 }
  } else {
    style.left = position.left;
    style.right = "auto";
  }

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
  disabled = false,
  children,
}: {
  label: ReactNode;
  className?: string;
  wrapperClassName?: string;
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
    return (
      <span className={wrapperClass}>
        <span className="text-gray opacity-50" style={{ cursor: "not-allowed" }}>
          {label}
        </span>
      </span>
    );
  }

  return (
    <span className={wrapperClass}>
      <a
        ref={triggerRef}
        className={triggerClass}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        role="button"
      >
        {label}
      </a>
      <DropdownMenu isOpen={open} onClose={close} triggerRef={triggerRef}>
        {menuContent}
      </DropdownMenu>
    </span>
  );
}
