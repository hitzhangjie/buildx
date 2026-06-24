import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import { createProjectPullRequest } from "../../../api/pullRequests";
import { fetchBranches, fetchDefaultBranch } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";

export function NewPullRequestPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [projectId, setProjectId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [sourceBranch, setSourceBranch] = useState(searchParams.get("source") ?? "");
  const [targetBranch, setTargetBranch] = useState(searchParams.get("target") ?? "");
  const [description, setDescription] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchProjects()
      .then((projects) => {
        if (!cancelled) {
          setProjectId(projects.find((p) => p.path === projectPath)?.id ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProjectId(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    if (!projectId) {
      return;
    }
    let cancelled = false;
    void Promise.all([fetchBranches(projectId), fetchDefaultBranch(projectId)])
      .then(([branchList, defaultBranch]) => {
        if (cancelled) {
          return;
        }
        setBranches(branchList);
        const urlSource = searchParams.get("source");
        const urlTarget = searchParams.get("target");
        if (!urlTarget) {
          if (defaultBranch) {
            setTargetBranch(defaultBranch);
          } else if (branchList.length > 0) {
            setTargetBranch(branchList[0]);
          }
        }
        if (!urlSource && branchList.length > 1) {
          const nonDefault = branchList.find((b) => b !== defaultBranch);
          if (nonDefault) {
            setSourceBranch(nonDefault);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBranches([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!title.trim()) {
      errors.push("Title is required");
    }
    if (!sourceBranch.trim()) {
      errors.push("Source branch is required");
    }
    if (!targetBranch.trim()) {
      errors.push("Target branch is required");
    }
    if (sourceBranch === targetBranch) {
      errors.push("Source and target branches must be different");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const { number } = await createProjectPullRequest(
        projectPath,
        title.trim(),
        sourceBranch.trim(),
        targetBranch.trim(),
        description,
      );
      navigate(`/${projectPath}/~pulls/${number}`);
    } catch (err) {
      setFormErrors([(err as { message?: string }).message ?? "Failed to create pull request"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    navigate(`/${projectPath}/~pulls`);
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Pull Request">
      <div className="card m-3">
        <div className="card-body">
          <form className="leave-confirm" method="post" onSubmit={handleSubmit}>
            <FormFeedbackPanel messages={formErrors} />
            <div className="mb-4">
              <label className="form-label" htmlFor="title">
                Title <span className="text-danger">*</span>
              </label>
              <div className="clearable-wrapper">
                <input
                  id="title"
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Pull request title"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="sourceBranch">
                Source Branch <span className="text-danger">*</span>
              </label>
              {branches.length > 0 ? (
                <select
                  id="sourceBranch"
                  className="form-control"
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  required
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="clearable-wrapper">
                  <input
                    id="sourceBranch"
                    type="text"
                    className="form-control"
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    placeholder="e.g. feature/my-feature"
                    required
                  />
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="targetBranch">
                Target Branch <span className="text-danger">*</span>
              </label>
              {branches.length > 0 ? (
                <select
                  id="targetBranch"
                  className="form-control"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  required
                >
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="clearable-wrapper">
                  <input
                    id="targetBranch"
                    type="text"
                    className="form-control"
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    placeholder="e.g. main"
                    required
                  />
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the changes in this pull request"
              />
            </div>
            <div className="d-flex align-items-center">
              <button type="submit" className="btn btn-primary mr-3" disabled={submitting}>
                <Icon name="tick" /> {submitting ? "Creating…" : "Create"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProjectLayout>
  );
}
