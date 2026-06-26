import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

type BeanEditorGroupProps = {
  /** When omitted, properties are always visible (ungrouped top section). */
  title?: string;
  groupClassName?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
};

/**
 * Collapsible property group inside BeanEditor — mirrors OneDev BeanEditor.html groups.
 * Ungrouped properties (no title) are always expanded with toggle hidden.
 */
export function BeanEditorGroup({
  title,
  groupClassName,
  defaultExpanded = false,
  children,
}: BeanEditorGroupProps) {
  const isUngrouped = !title;
  const [expanded, setExpanded] = useState(isUngrouped || defaultExpanded);

  const groupClass = [
    "group",
    "bean-properties",
    groupClassName,
    isUngrouped || expanded ? "expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={groupClass}>
      {!isUngrouped ? (
        <a
          href="#"
          className="toggle d-flex align-items-center"
          onClick={(e) => {
            e.preventDefault();
            setExpanded((v) => !v);
          }}
        >
          <span className="mr-3">{title}</span>
          <Icon name="arrow" className="icon ml-auto" />
        </a>
      ) : null}
      <div>
        <div>{children}</div>
      </div>
    </div>
  );
}
