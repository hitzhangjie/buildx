import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProject, fetchProjects } from "../../api/projects";
import { BeanEditor } from "../../components/onedev/BeanEditor";
import { BeanFormGroup } from "../../components/onedev/BeanFormGroup";
import { BeanSwitch } from "../../components/onedev/BeanSwitch";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Select2MultiChoice } from "../../components/onedev/Select2MultiChoice";
import { Select2SingleChoice } from "../../components/onedev/Select2SingleChoice";
import { Layout } from "../../layout/Layout";
import { setFlashMessage } from "../../util/flash";

function deriveKey(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) {
    return "PROJ";
  }
  return cleaned.length <= 10 ? cleaned : cleaned.slice(0, 10);
}

const PROJECT_KEY_DESCRIPTION = (
  <>
    Optionally define a unique key for the project with two or more upper case letters. This key
    can be used to reference issues, builds, and pull requests with a stable and short form{" "}
    <code>&lt;project key&gt;-&lt;number&gt;</code> instead of{" "}
    <code>&lt;project path&gt;#&lt;number&gt;</code>
  </>
);

const DEFAULT_ROLES_DESCRIPTION = (
  <>
    Default roles affect default permissions granted to everyone in the system. The actual default
    permissions will be <b className="text-warning">all permissions</b> contained in default roles
    of this project and all its parent projects
  </>
);

const PACK_MANAGEMENT_DESCRIPTION = (
  <>
    Enable{" "}
    <a href="https://docs.onedev.io/tutorials/package/working-with-packages" target="_blank" rel="noreferrer">
      package management
    </a>{" "}
    for this project
  </>
);

const TIME_TRACKING_DESCRIPTION = (
  <>
    <b className="text-warning">NOTE: </b>
    <a href="https://docs.onedev.io/tutorials/issue/time-tracking" target="_blank" rel="noreferrer">
      Time tracking
    </a>{" "}
    is an enterprise feature.{" "}
    <a href="https://onedev.io/pricing" target="_blank" rel="noreferrer">
      Try free
    </a>{" "}
    for 30 days
  </>
);

/**
 * Mirrors OneDev NewProjectPage.html + four BeanEditors.
 * Reference: references/onedev/.../web/page/project/NewProjectPage.html
 */
export function NewProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentIdParam = searchParams.get("parent");

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [codeManagement, setCodeManagement] = useState(true);
  const [issueManagement, setIssueManagement] = useState(true);
  const [packManagement, setPackManagement] = useState(true);
  const [timeTracking, setTimeTracking] = useState(false);
  const [defaultRoles, setDefaultRoles] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [parentPath, setParentPath] = useState("");
  const [parentChoices, setParentChoices] = useState<string[]>([]);
  const [roleChoices] = useState<string[]>([]);
  const [labelChoices] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const hideParentEditor = parentIdParam != null && parentIdParam !== "";
  const topbarTitle = hideParentEditor ? "Create Child Project" : "Create Project";

  useEffect(() => {
    let cancelled = false;
    void fetchProjects().then((projects) => {
      if (cancelled) {
        return;
      }
      const paths = projects.map((p) => p.path).sort();
      setParentChoices(paths);
      if (parentIdParam) {
        const parent = projects.find((p) => String(p.id) === parentIdParam);
        if (parent) {
          setParentPath(parent.path);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [parentIdParam]);

  useEffect(() => {
    if (!issueManagement && timeTracking) {
      setTimeTracking(false);
    }
  }, [issueManagement, timeTracking]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);
    setSubmitting(true);
    try {
      const projectName = name.trim();
      const project = await createProject({
        name: projectName,
        key: key.trim() || deriveKey(projectName),
        description: description.trim(),
        parentPath: parentPath.trim() || undefined,
      });
      setFlashMessage("New project created");
      if (codeManagement) {
        navigate(`/${project.path}/~files`, { replace: true });
      } else if (issueManagement) {
        navigate(`/${project.path}/~issues`, { replace: true });
      } else if (packManagement) {
        navigate(`/${project.path}/~packages`, { replace: true });
      } else {
        navigate(`/${project.path}/~children`, { replace: true });
      }
    } catch (err) {
      setFormErrors([(err as { message?: string }).message ?? "Failed to create project"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title={topbarTitle} topbarTitle={topbarTitle}>
      <div className="card new-project m-2 m-sm-5">
        <div className="card-body">
          <form className="leave-confirm" method="post" onSubmit={onSubmit}>
            <FormFeedbackPanel messages={formErrors} />
            <BeanEditor>
              <BeanFormGroup property="name" label="Name" required>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </BeanFormGroup>
              <BeanFormGroup
                property="key"
                label="Project Key"
                description={PROJECT_KEY_DESCRIPTION}
              >
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                  />
                </div>
              </BeanFormGroup>
              <BeanFormGroup property="description" label="Description">
                <textarea
                  className="form-control"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </BeanFormGroup>
              <BeanFormGroup
                property="codeManagement"
                label="Code Management"
                description="Whether or not to enable code management for the project"
              >
                <BeanSwitch checked={codeManagement} onChange={setCodeManagement} />
              </BeanFormGroup>
              <BeanFormGroup
                property="issueManagement"
                label="Issue Management"
                description="Whether or not to enable issue management for the project"
              >
                <BeanSwitch checked={issueManagement} onChange={setIssueManagement} />
              </BeanFormGroup>
              <BeanFormGroup
                property="timeTracking"
                label="Time Tracking"
                description={TIME_TRACKING_DESCRIPTION}
              >
                <BeanSwitch
                  checked={timeTracking}
                  onChange={setTimeTracking}
                  disabled={!issueManagement}
                />
              </BeanFormGroup>
              <BeanFormGroup
                property="packManagement"
                label="Package Management"
                description={PACK_MANAGEMENT_DESCRIPTION}
              >
                <BeanSwitch checked={packManagement} onChange={setPackManagement} />
              </BeanFormGroup>
            </BeanEditor>
            <BeanEditor>
              <BeanFormGroup
                property="roleNames"
                label="Default Roles"
                description={DEFAULT_ROLES_DESCRIPTION}
              >
                <Select2MultiChoice
                  values={defaultRoles}
                  onChange={setDefaultRoles}
                  choices={roleChoices}
                  placeholder={hideParentEditor ? "Inherit from parent" : "No default roles"}
                />
              </BeanFormGroup>
            </BeanEditor>
            <BeanEditor>
              <BeanFormGroup
                property="labels"
                label="Labels"
                description="Labels can be defined in Administration / Label Management"
              >
                <Select2MultiChoice
                  values={labels}
                  onChange={setLabels}
                  choices={labelChoices}
                />
              </BeanFormGroup>
            </BeanEditor>
            {!hideParentEditor && (
              <BeanEditor>
                <BeanFormGroup
                  property="parentPath"
                  label="Parent Project"
                  description="Settings and permissions of parent project will be inherited by this project"
                >
                  <Select2SingleChoice
                    value={parentPath}
                    onChange={setParentPath}
                    choices={parentChoices}
                    placeholder="No parent"
                    allowClear
                  />
                </BeanFormGroup>
              </BeanEditor>
            )}
            <input
              className="btn btn-primary dirty-aware"
              type="submit"
              value="Create"
              disabled={submitting}
            />
          </form>
        </div>
      </div>
    </Layout>
  );
}
