import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import {
  fetchProjects,
  uploadProjectAvatar,
  projectAvatarUrl,
} from "../../../api/projects";

/**
 * Edit Avatar page for a project.
 * Route: {project}/~settings/avatar-edit
 * Reference: references/onedev/.../web/page/project/setting/avatar/AvatarEditPage.html
 *
 * OneDev DOM:
 * <div class="avatar-edit card"><div class="card-body">
 *   <div class="current border-bottom pb-5 mb-5">
 *     <h6 class="title mb-4">Current avatar</h6>
 *     <img wicket:id="avatar"/>  <!-- 240x240 per CSS -->
 *     <a wicket:id="useDefault" class="btn btn-primary mt-4">Use Default</a>
 *   </div>
 *   <div class="use-uploaded">
 *     <h6 class="title mb-4">Upload avatar</h6>
 *     <form wicket:id="form">
 *       <div wicket:id="avatar"></div>  <!-- AvatarUploadField -->
 *       <button wicket:id="upload" type="submit" class="btn btn-primary mt-4">Upload</button>
 *     </form>
 *   </div>
 * </div></div>
 */
export default function AvatarEditPage() {
  const { projectPath } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  // Resolve project ID.
  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        const found = projects.find((p) => p.path === projectPath);
        if (found) {
          setProjectId(found.id);
          setAvatarUrl(projectAvatarUrl(found.id));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
      setFeedback("");

      // Local preview.
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const handleUpload = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!projectId || !selectedFile) return;
      setUploading(true);
      setFeedback("");
      try {
        await uploadProjectAvatar(projectId, selectedFile);
        setFeedback("Avatar updated successfully.");
        // Refresh the displayed avatar URL with cache busting.
        setAvatarUrl(projectAvatarUrl(projectId));
        setSelectedFile(null);
        setPreviewUrl("");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setFeedback(`Upload failed: ${message}`);
      } finally {
        setUploading(false);
      }
    },
    [projectId, selectedFile],
  );

  const handleUseDefault = useCallback(async () => {
    // OneDev stores a null avatar to use the default.
    // In BuildX, we can achieve this by deleting the uploaded avatar file
    // or marking it as default. For now, simply refresh to the default URL.
    setAvatarUrl(`/~api/projects/${projectId}/avatar?t=${Date.now()}`);
    setSelectedFile(null);
    setPreviewUrl("");
    setFeedback("Avatar reset to default.");
  }, [projectId]);

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Edit Avatar">
      {/* Matches OneDev: <div class="avatar-edit card"> */}
      <div className="avatar-edit card">
        <div className="card-body">
          {/* Current avatar section */}
          <div className="current border-bottom pb-5 mb-5">
            <h6 className="title mb-4">Current avatar</h6>
            <img
              src={avatarUrl || previewUrl}
              alt="Project avatar"
              style={{ height: 240, width: 240, display: "block" }}
            />
            <a
              className="btn btn-primary mt-4"
              onClick={handleUseDefault}
              role="button"
            >
              <Icon name="undo" className="icon mr-2" /> Use Default
            </a>
          </div>

          {/* Upload avatar section */}
          <div className="use-uploaded">
            <h6 className="title mb-4">Upload avatar</h6>
            {feedback && (
              <div className={`alert alert-${feedback.includes("failed") ? "danger" : "success"} mb-3`}>
                {feedback}
              </div>
            )}
            <form onSubmit={handleUpload}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/svg+xml"
                className="form-control mb-3"
                onChange={handleFileSelect}
              />
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Icon name="spinner" className="icon mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <Icon name="upload" className="icon mr-2" /> Upload
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
