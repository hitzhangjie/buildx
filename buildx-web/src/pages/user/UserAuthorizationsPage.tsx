import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchUsers } from "../../api/users";
import { fetchRoles, type Role } from "../../api/roles";
import { fetchProjects, type Project } from "../../api/projects";
import {
  fetchUserAuthorizations,
  syncUserAuthorizations,
  type ProjectAuthorizationBean,
} from "../../api/userAuthorizations";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Select2SingleChoice } from "../../components/onedev/Select2SingleChoice";
import { Select2MultiChoice } from "../../components/onedev/Select2MultiChoice";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev UserAuthorizationsPage (user-level, not project-level).
 * Reference: references/onedev/.../web/page/user/authorization/UserAuthorizationsPage.html
 */
export function UserAuthorizationsPage() {
  const { user: userName } = useParams<{ user: string }>();

  const [userId, setUserId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projectPaths, setProjectPaths] = useState<string[]>([]);
  const [rows, setRows] = useState<ProjectAuthorizationBean[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resolve user name to numeric ID.
  useEffect(() => {
    if (!userName) return;
    let cancelled = false;
    fetchUsers()
      .then((users) => {
        if (cancelled) return;
        const found = users.find(
          (u) => u.name === userName || String(u.id) === userName,
        );
        setUserId(found?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userName]);

  // Load roles and project paths.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRoles(), fetchProjects()])
      .then(([roleList, projectList]) => {
        if (cancelled) return;
        setRoles(roleList);
        setProjectPaths(
          projectList.map((p: Project) => p.path).sort(),
        );
      })
      .catch(() => {
        // Keep defaults; component still renders with empty lists.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load current authorizations.
  useEffect(() => {
    if (userId === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchUserAuthorizations(userId)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
      })
      .catch(() => {
        if (!cancelled) setErrors(["Failed to load authorizations"]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { projectPath: "", roleNames: [] }]);
    setSuccessMessage(null);
    setErrors([]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSuccessMessage(null);
    setErrors([]);
  }, []);

  const updateRow = useCallback(
    (index: number, patch: Partial<ProjectAuthorizationBean>) => {
      setRows((prev) =>
        prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      );
      setSuccessMessage(null);
      setErrors([]);
    },
    [],
  );

  const handleSave = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      setSuccessMessage(null);
      setErrors([]);

      if (userId === null) {
        setErrors(["User not found"]);
        return;
      }

      // Validate.
      const newErrors: string[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.projectPath.trim()) {
          newErrors.push(`Row ${i + 1}: Project is required`);
        }
        if (row.roleNames.length === 0) {
          newErrors.push(`Row ${i + 1}: At least one role is required`);
        }
        if (row.projectPath && seen.has(row.projectPath)) {
          newErrors.push(
            `Row ${i + 1}: Duplicate project "${row.projectPath}"`,
          );
        }
        if (row.projectPath) {
          seen.add(row.projectPath);
        }
      }
      if (newErrors.length > 0) {
        setErrors(newErrors);
        return;
      }

      setSaving(true);
      try {
        await syncUserAuthorizations(userId, rows);
        // Reload to reflect server-side grouping.
        const fresh = await fetchUserAuthorizations(userId);
        setRows(fresh);
        setSuccessMessage("Project authorizations updated");
      } catch (err) {
        setErrors([
          (err as { message?: string }).message ??
            "Failed to save authorizations",
        ]);
      } finally {
        setSaving(false);
      }
    },
    [userId, rows],
  );

  const roleNames = roles.map((r) => r.name);

  // User tabs matching OneDev UserPage.java tab order.
  const resolvedUserParam = userName ?? "";
  const userTabs = [
    { label: "Profile", path: `/~users/${resolvedUserParam}` },
    { label: "Basic Settings", path: `/~users/${resolvedUserParam}/basic-setting` },
    { label: "Email Addresses", path: `/~users/${resolvedUserParam}/email-setting` },
    { label: "Edit Avatar", path: `/~users/${resolvedUserParam}/avatar` },
    { label: "Password", path: `/~users/${resolvedUserParam}/password` },
    { label: "Belonging Groups", path: `/~users/${resolvedUserParam}/groups` },
    { label: "Authorized Projects", path: `/~users/${resolvedUserParam}/authorizations` },
    { label: "SSH Keys", path: `/~users/${resolvedUserParam}/ssh-keys` },
    { label: "GPG Keys", path: `/~users/${resolvedUserParam}/gpg-keys` },
    { label: "Access Tokens", path: `/~users/${resolvedUserParam}/access-tokens` },
  ];

  return (
    <Layout title={`${userName ?? ""} — Authorized Projects`}>
      <div className="card user-detail m-2 m-sm-5">
        <div className="card-body">
          {/* User tabs — matches OneDev UserPage.html */}
          <ul className="tabs nav nav-bold nav-tabs nav-tabs-line text-weight-bold mb-4">
            {userTabs.map((tab) => (
              <li className="nav-item" key={tab.path}>
                <Link
                  to={tab.path}
                  className={`nav-link${
                    tab.label === "Authorized Projects" ? " active" : ""
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Info notice — matches UserAuthorizationsPage.html */}
          <div className="alert alert-notice alert-light-info mb-4">
            <Icon name="bulb" className="icon mr-2" width={16} height={16} />
            When authorize a project, all child projects will also be authorized
            with assigned roles
          </div>

          {loading ? (
            <div className="text-muted text-center py-5">Loading...</div>
          ) : (
            <form
              className="user-authorizations leave-confirm"
              onSubmit={handleSave}
            >
              <FormFeedbackPanel messages={errors} />

              {successMessage ? (
                <div className="alert alert-success mb-3">{successMessage}</div>
              ) : null}

              <div className="bean-list">
                <table
                  className={rows.length === 0 ? "norecords" : ""}
                >
                  <thead>
                    <tr>
                      <th className="actions minimum" />
                      <th className="property-projectPath">
                        Project <span className="text-danger">*</span>
                      </th>
                      <th className="property-roleNames">
                        Role <span className="text-danger">*</span>
                      </th>
                      <th className="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        <td className="actions minimum">
                          <Icon
                            name="grip"
                            className="icon drag-indicator"
                            width={16}
                            height={16}
                          />
                        </td>
                        <td className="property-projectPath">
                          <Select2SingleChoice
                            value={row.projectPath}
                            onChange={(v) => updateRow(i, { projectPath: v })}
                            choices={projectPaths}
                            placeholder="Select a project..."
                          />
                        </td>
                        <td className="property-roleNames">
                          <Select2MultiChoice
                            values={row.roleNames}
                            onChange={(v) => updateRow(i, { roleNames: v })}
                            choices={roleNames}
                            checkboxList={true}
                            placeholder="Select roles..."
                          />
                        </td>
                        <td className="actions minimum">
                          <a
                            className="btn btn-icon btn-light btn-hover-danger"
                            role="button"
                            onClick={() => removeRow(i)}
                            title="Delete this"
                          >
                            <Icon
                              name="trash"
                              className="icon delete"
                              width={16}
                              height={16}
                            />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-muted py-3"
                        >
                          Unspecified
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="foot">
                  <a
                    className="add-element btn btn-light btn-hover-primary btn-block"
                    role="button"
                    onClick={addRow}
                  >
                    <Icon name="plus" className="icon" width={16} height={16} />
                  </a>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary dirty-aware mt-4"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
