import type { ReactNode } from "react";

/**
 * Mirrors OneDev BeanEditor panel: div.bean-editor.editable > div.group.bean-properties.expanded
 * Reference: references/onedev/.../web/editable/BeanEditor.html
 */
export function BeanEditor({ children }: { children: ReactNode }) {
  return (
    <div className="bean-editor editable">
      <div className="group bean-properties expanded">
        <div>{children}</div>
      </div>
      <div className="disable-mask" />
    </div>
  );
}
