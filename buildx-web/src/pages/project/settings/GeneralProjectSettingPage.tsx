import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import {
  fetchProjects,
  fetchProject,
  updateProject,
  deleteProject,
  type ProjectDetail,
} from "../../../api/projects";

/**
 * General Project Settings page.
 * Route: {project}/~settings/general
 * Reference: references/onedev/.../web/page/project/setting/general/GeneralProjectSettingPage.html
 *
 * Matches OneDev DOM:
 * <div class="card"><div class="card-body">
 *   <form class="leave-confirm">
 *     <div wicket:id="editor">...</div>        <!-- name, key, description, toggles -->
 *     <div wicket:id="defaultRoleEditor">...</div>  <!-- default roles (future) -->
 *     <div wicket:id="labelsEditor">...</div>       <!-- labels (future) -->
 *     <div wicket:id="parentEditor">...</div>       <!-- parent project (future) -->
 *     <div class="d-flex">
 *       <input class="btn btn-primary dirty-aware mr-1" type="submit" value="Update">
 *       <a class="delete btn btn-light-danger ml-auto">Delete</a>
 *     </div>
 *   </form>
 * </div></div>
 */
export default function GeneralProjectSettingPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields — matching OneDev's Project fields.
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [codeManagement, setCodeManagement] = useState(true);
  const [packManagement, setPackManagement] = useState(true);
  const [issueManagement, setIssueManagement] = useState(true);
  const [timeTracking, setTimeTracking] = useState(false);
  const [serviceDeskEmail, setServiceDeskEmail] = useState("");

  // Dirty tracking.
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  // Feedback.
  const [feedbackMessages, setFeedbackMessages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmPath, setDeleteConfirmPath] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  // Resolve project path to numeric ID.
  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((projects) => {
        if (cancelled) return;
        const found = projects.find((p) => p.path === projectPath);
        setProjectId(found?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setProjectId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Load project data.
  useEffect(() => {
    if (projectId === null) return;
    let cancelled = false;
    setLoading(true);
    fetchProject(projectId)
      .then((p: ProjectDetail) => {
        if (cancelled) return;
        const vals = {
          name: p.name || "",
          key: p.key || "",
          description: p.description || "",
          codeManagement: p.codeManagement ?? true,
          packManagement: p.packManagement ?? true,
          issueManagement: p.issueManagement ?? true,
          timeTracking: p.timeTracking ?? false,
          serviceDeskEmail: p.serviceDeskEmailAddress || "",
        };
        setName(vals.name);
        setKey(vals.key);
        setDescription(vals.description);
        setCodeManagement(vals.codeManagement);
        setPackManagement(vals.packManagement);
        setIssueManagement(vals.issueManagement);
        setTimeTracking(vals.timeTracking);
        setServiceDeskEmail(vals.serviceDeskEmail);
        setInitialValues(vals);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setFeedbackMessages([`Failed to load project: ${err.message}`]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Track dirty state.
  useEffect(() => {
    const current = {
      name,
      key,
      description,
      codeManagement,
      packManagement,
      issueManagement,
      timeTracking,
      serviceDeskEmail,
    };
    const isDirty = Object.keys(current).some(
      (k) => current[k as keyof typeof current] !== initialValues[k],
    );
    setDirty(isDirty);
  }, [
    name, key, description,
    codeManagement, packManagement, issueManagement, timeTracking,
    serviceDeskEmail, initialValues,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (projectId === null) return;
      setSaving(true);
      setFeedbackMessages([]);
      try {
        await updateProject(projectId, {
          name,
          key,
          description,
          codeManagement,
          packManagement,
          issueManagement,
          timeTracking,
          serviceDeskEmailAddress: serviceDeskEmail || undefined,
        });
        setFeedbackMessages(["General settings updated"]);
        // Update initial values to current so dirty state resets.
        setInitialValues({
          name, key, description,
          codeManagement, packManagement, issueManagement, timeTracking,
          serviceDeskEmail,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setFeedbackMessages([message]);
      } finally {
        setSaving(false);
      }
    },
    [
      projectId, name, key, description,
      codeManagement, packManagement, issueManagement, timeTracking,
      serviceDeskEmail,
    ],
  );

  const handleDeleteClick = useCallback(() => {
    setDeleteConfirmPath(projectPath);
    setDeleteInput("");
    setShowDeleteConfirm(true);
  }, [projectPath]);

  const handleDeleteConfirm = useCallback(async () => {
    if (projectId === null) return;
    if (deleteInput !== projectPath) return;
    try {
      await deleteProject(projectId);
      navigate("/~projects");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setFeedbackMessages([message]);
      setShowDeleteConfirm(false);
    }
  }, [projectId, deleteInput, projectPath, navigate]);

  if (loading) {
    return (
      <SettingsLayout projectPath={projectPath} pageTitle="General Settings">
        <div className="card"><div className="card-body text-center py-5">Loading...</div></div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="General Settings">
      {/* Matches OneDev: <div class="card"><div class="card-body"><form class="leave-confirm"> */}
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedbackMessages} />
          <form className="leave-confirm" onSubmit={handleSubmit}>
            {/* Editor section — matches <div wicket:id="editor"> */}
            <div className="mb-3">
              <label className="form-label" htmlFor="general-name">
                Name
              </label>
              <input
                id="general-name"
                className="form-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="general-key">
                Key
              </label>
              <input
                id="general-key"
                className="form-control"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="Optional unique identifier"
              />
              <small className="text-muted">
                Used for URL references. Leave blank to auto-derive from name.
              </small>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="general-description">
                Description
              </label>
              <textarea
                id="general-description"
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Management toggles — matches OneDev boolean checkboxes */}
            <fieldset className="mb-3">
              <legend className="form-label fs-6">Features</legend>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="general-code"
                  checked={codeManagement}
                  onChange={(e) => setCodeManagement(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="general-code">
                  Code Management
                </label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="general-pack"
                  checked={packManagement}
                  onChange={(e) => setPackManagement(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="general-pack">
                  Package Management
                </label>
              </div>
              <div className="form-check form-switch mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="general-issue"
                  checked={issueManagement}
                  onChange={(e) => setIssueManagement(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="general-issue">
                  Issue Management
                </label>
              </div>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="general-timetrack"
                  checked={timeTracking}
                  onChange={(e) => setTimeTracking(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="general-timetrack">
                  Time Tracking
                </label>
              </div>
            </fieldset>

            <div className="mb-3">
              <label className="form-label" htmlFor="general-servicedesk">
                Service Desk Email
              </label>
              <input
                id="general-servicedesk"
                className="form-control"
                type="email"
                value={serviceDeskEmail}
                onChange={(e) => setServiceDeskEmail(e.target.value)}
                placeholder="service-desk@example.com"
              />
            </div>

            {/* Action buttons — matches OneDev: d-flex with Update + Delete */}
            <div className="d-flex">
              <button
                type="submit"
                className={`btn btn-primary dirty-aware mr-1${dirty ? "" : ""}`}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Icon name="spinner" className="mr-1" /> Saving...
                  </>
                ) : (
                  "Update"
                )}
              </button>
              <a
                className="delete btn btn-light-danger ml-auto"
                onClick={handleDeleteClick}
                role="button"
                tabIndex={0}
              >
                Delete
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation modal — matches OneDev ConfirmModalPanel */}
      {showDeleteConfirm && (
        <div
          className="modal-backdrop fade show"
          onClick={() => setShowDeleteConfirm(false)}
        />
      )}
      {showDeleteConfirm && (
        <div className="modal d-block fade show" tabIndex={-1} role="dialog">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Project Deletion</h5>
              </div>
              <div className="modal-body">
                <p>
                  Everything inside this project and all child projects will be
                  deleted and cannot be recovered. Please type the project path{" "}
                  <code>{deleteConfirmPath}</code> below to confirm deletion.
                </p>
                <input
                  className="form-control"
                  type="text"
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={deleteConfirmPath}
                />
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  disabled={deleteInput !== deleteConfirmPath}
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}
