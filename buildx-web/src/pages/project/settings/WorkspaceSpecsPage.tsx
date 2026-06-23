import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface WorkspaceSpec {
  id: string;
  name: string;
  image: string;
  cpu: string;
  memory: string;
}

export default function WorkspaceSpecsPage() {
  const { projectPath } = useProject();

  const [specs, setSpecs] = useState<WorkspaceSpec[]>([
    {
      id: "1",
      name: "default",
      image: "ubuntu:22.04",
      cpu: "2",
      memory: "4Gi",
    },
    {
      id: "2",
      name: "large",
      image: "ubuntu:22.04",
      cpu: "8",
      memory: "16Gi",
    },
  ]);

  const handleRemove = (id: string) => {
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Workspace Specs">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Image</th>
                <th>CPU</th>
                <th>Memory</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {specs.map((spec) => (
                <tr key={spec.id}>
                  <td>
                    <strong>{spec.name}</strong>
                  </td>
                  <td>
                    <code>{spec.image}</code>
                  </td>
                  <td>{spec.cpu} cores</td>
                  <td>{spec.memory}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-link me-2">
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => handleRemove(spec.id)}
                    >
                      <Icon name="remove" />
                    </button>
                  </td>
                </tr>
              ))}
              {specs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted text-center">
                    No workspace specs configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button type="button" className="btn btn-primary btn-sm">
            <Icon name="plus" className="me-1" />
            Add Spec
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
