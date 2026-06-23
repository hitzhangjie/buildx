import { useRef } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

export default function AvatarEditPage() {
  const { projectPath } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Avatar">
      <div className="card">
        <div className="card-body">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light"
              style={{ width: 128, height: 128, fontSize: "3rem" }}
            >
              {"?"}
            </div>
          </div>
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/svg+xml"
              className="d-none"
            />
            <button className="btn btn-primary" onClick={handleUploadClick}>
              <Icon name="upload" className="me-1" />
              Upload Avatar
            </button>
            <p className="text-muted mt-2 small">
              Supported formats: PNG, JPEG, GIF, SVG. Max 1 MB.
            </p>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
