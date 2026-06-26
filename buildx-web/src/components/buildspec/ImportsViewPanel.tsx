import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { BuildSpecImport } from "../../buildspec/types";

type ImportsViewPanelProps = {
  imports: BuildSpecImport[];
};

export function ImportsViewPanel({ imports }: ImportsViewPanelProps) {
  return (
    <div className="content imports autofit pr-3">
      {imports.map((item, index) => (
        <div key={index} className="import mb-4">
          <BeanEditor>
            <BeanFormGroup property="projectPath" label="Project Path">
              <span>{item.projectPath}</span>
            </BeanFormGroup>
            <BeanFormGroup property="revision" label="Revision">
              <span>{item.revision ?? item.tag ?? ""}</span>
            </BeanFormGroup>
            <BeanFormGroup property="accessTokenSecret" label="Access Token Secret">
              <span>{item.accessTokenSecret ?? ""}</span>
            </BeanFormGroup>
          </BeanEditor>
        </div>
      ))}
    </div>
  );
}
