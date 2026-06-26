import type { ReactNode } from "react";
import { BeanEditorGroup } from "./BeanEditorGroup";

type BeanEditorProps = {
  children: ReactNode;
  /** When false, children are rendered as-is (e.g. multiple collapsible groups). Default true. */
  grouped?: boolean;
};

/**
 * Mirrors OneDev BeanEditor panel: div.bean-editor.editable > div.group.bean-properties.expanded
 * Reference: references/onedev/.../web/editable/BeanEditor.html
 */
export function BeanEditor({ children, grouped = true }: BeanEditorProps) {
  return (
    <div className="bean-editor editable">
      {grouped ? <BeanEditorGroup>{children}</BeanEditorGroup> : children}
      <div className="disable-mask" />
    </div>
  );
}
