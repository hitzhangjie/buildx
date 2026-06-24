import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import "./SelectionPopover.css";

export type SelectionPopoverAction = {
  key: string;
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
};

type SelectionPopoverProps = {
  position: { top: number; left: number };
  actions: SelectionPopoverAction[];
  onClose: () => void;
};

export function SelectionPopover({ position, actions, onClose }: SelectionPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    let left = position.left - width / 2;
    let top = position.top - height;
    if (left < 0) {
      left = 0;
    }
    if (left + width > window.innerWidth) {
      left = window.innerWidth - width;
    }
    if (top < 0) {
      top = 0;
    }
    if (top + height > window.innerHeight) {
      top = window.innerHeight - height;
    }
    const hideTriangle = top + height > position.top + 10;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    const triangle = el.querySelector<HTMLElement>(".triangle");
    if (triangle) {
      triangle.style.display = hideTriangle ? "none" : "";
    }
  }, [position]);

  return createPortal(
    <div ref={ref} className="selection-popover">
      <div className="content">
        {actions.map((action) =>
          action.href ? (
            <a key={action.key} href={action.href} className={action.key} onClick={onClose}>
              <Icon name={action.icon} className="icon mr-1" width={14} height={14} />
              {action.label}
            </a>
          ) : (
            <a
              key={action.key}
              href="#"
              className={action.key}
              onClick={(e) => {
                e.preventDefault();
                action.onClick?.();
              }}
            >
              <Icon name={action.icon} className="icon mr-1" width={14} height={14} />
              {action.label}
            </a>
          ),
        )}
      </div>
      <div className="triangle" />
    </div>,
    document.body,
  );
}
