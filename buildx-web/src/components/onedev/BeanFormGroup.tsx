import type { ReactNode } from "react";

type BeanFormGroupProps = {
  property: string;
  label: string;
  required?: boolean;
  description?: ReactNode;
  fieldError?: string | null;
  children: ReactNode;
};

/** Mirrors OneDev BeanEditor property row (PropertyContainer + BeanEditor.html). */
export function BeanFormGroup({
  property,
  label,
  required,
  description,
  fieldError,
  children,
}: BeanFormGroupProps) {
  return (
    <div className={`form-group property-${property}`}>
      <label className="name control-label">
        <span>{label}</span>
        {required ? (
          <span className="text-danger">*</span>
        ) : (
          <span dangerouslySetInnerHTML={{ __html: "&nbsp;" }} />
        )}
      </label>
      <div className="value">
        <div className="property-editor editable">{children}</div>
      </div>
      {fieldError ? (
        <div className="feedback">
          <ul className="feedbackPanel">
            <li className="feedbackPanelERROR">{fieldError}</li>
          </ul>
        </div>
      ) : null}
      {description ? <div className="text-muted form-text">{description}</div> : null}
    </div>
  );
}
