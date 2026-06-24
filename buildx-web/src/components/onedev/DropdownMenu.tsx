import { useState, useRef, useEffect, type ReactNode } from "react";
import "./DropdownMenu.css";

/**
 * Floating dropdown panel — matches OneDev's FloatingPanel / dropdown-menu.
 * Anchors below the trigger element. Closes on outside click (mousedown
 * anywhere outside both the menu and the trigger).
 */
export function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={menuRef} className="floating dropdown-menu show" style={{ position: "absolute", zIndex: 1050 }}>
      <div className="dropdown-menu-content">{children}</div>
    </div>
  );
}

/**
 * Self-contained dropdown trigger + floating menu — matches OneDev's DropdownLink.
 * Renders a clickable anchor that toggles a DropdownMenu below it.
 */
export function InlineDropdown({
  label,
  className,
  disabled = false,
  children,
}: {
  label: ReactNode;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const linkClass = className ?? "text-gray";
  const triggerClass = `${linkClass}${open ? " dropdown-open" : ""}`;

  if (disabled) {
    return (
      <span className={`d-inline-block${className ? ` ${className}` : ""}`}>
        <span className="text-gray opacity-50" style={{ cursor: "not-allowed" }}>
          {label}
        </span>
      </span>
    );
  }

  return (
    <span className="dropdown-aware d-inline-block position-relative">
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
      <DropdownMenu isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
        {children}
      </DropdownMenu>
    </span>
  );
}
