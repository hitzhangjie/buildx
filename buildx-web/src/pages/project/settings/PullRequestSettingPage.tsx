import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type PullRequestSetting } from "../../../api/projects";

export default function PullRequestSettingPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [settings, setSettings] = useState<PullRequestSetting>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => {
    let c = false;
    fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {});
    return () => { c = true; };
  }, [projectPath]);

  useEffect(() => {
    if (projectId === null) return;
    let c = false; setLoading(true);
    fetchProjectSettings(projectId).then(s => {
      if (!c) { setSettings(s.pullRequestSetting ?? {}); setLoading(false); }
    }).catch(() => { if (!c) setLoading(false); });
    return () => { c = true; };
  }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (projectId === null) return;
    setSaving(true); setFeedback([]);
    try {
      await updateProjectSettings(projectId, { pullRequestSetting: settings });
      setFeedback(["Pull request settings updated."]);
    } catch (err: unknown) {
      setFeedback([err instanceof Error ? err.message : String(err)]);
    } finally { setSaving(false); }
  }, [projectId, settings]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Pull Request Settings"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Pull Request Settings">
      <div className="card"><div className="card-body">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Configure default pull request behavior for this project.</div>
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="mb-3">
            <label className="form-label">Default Merge Strategy</label>
            <select className="form-control" value={settings.defaultMergeStrategy ?? ""} onChange={e => setSettings({ ...settings, defaultMergeStrategy: e.target.value })}>
              <option value="">(default)</option>
              <option value="MERGE_COMMIT">Merge Commit</option>
              <option value="SQUASH">Squash</option>
              <option value="REBASE">Rebase</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Default Assignees</label>
            <input className="form-control" value={settings.defaultAssignees?.join(", ") ?? ""} onChange={e => setSettings({ ...settings, defaultAssignees: e.target.value ? e.target.value.split(",").map(s => s.trim()).filter(Boolean) : [] })} placeholder="user1, user2" />
          </div>
          <div className="form-check form-switch mb-3">
            <input className="form-check-input" type="checkbox" checked={settings.deleteSourceBranchAfterMerge ?? false} onChange={e => setSettings({ ...settings, deleteSourceBranchAfterMerge: e.target.checked })} id="pr-del-src" />
            <label className="form-check-label" htmlFor="pr-del-src">Delete source branch after merge</label>
          </div>
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>
  );
}
