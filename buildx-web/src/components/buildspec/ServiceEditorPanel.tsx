import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { Service } from "../../buildspec/types";

type ServiceEditorPanelProps = {
  service: Service;
  onChange: (service: Service) => void;
};

export function ServiceEditorPanel({ service, onChange }: ServiceEditorPanelProps) {
  const update = (patch: Partial<Service>) => onChange({ ...service, ...patch });

  return (
    <BeanEditor>
      <BeanFormGroup property="name" label="Name" required>
        <input
          type="text"
          className="form-control"
          value={service.name ?? ""}
          onChange={(e) => update({ name: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="image" label="Image" required>
        <input
          type="text"
          className="form-control"
          value={service.image ?? ""}
          onChange={(e) => update({ image: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="command" label="Command">
        <input
          type="text"
          className="form-control"
          value={service.command ?? ""}
          onChange={(e) => update({ command: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="readyCommand" label="Ready Command">
        <input
          type="text"
          className="form-control"
          value={service.readyCommand ?? ""}
          onChange={(e) => update({ readyCommand: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="ports" label="Ports" description="Comma-separated port numbers">
        <input
          type="text"
          className="form-control"
          value={(service.ports ?? []).join(", ")}
          onChange={(e) =>
            update({
              ports: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map(Number)
                .filter((n) => !Number.isNaN(n)),
            })
          }
        />
      </BeanFormGroup>
    </BeanEditor>
  );
}
