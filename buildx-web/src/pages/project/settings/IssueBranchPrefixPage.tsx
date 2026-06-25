import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProjectSettings, updateProjectSettings } from "../../../api/projects";

export default function IssueBranchPrefixPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [branchPrefix, setBranchPrefix] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setBranchPrefix(s.issueSetting?.branchPrefix ?? ""); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { issueSetting: { branchPrefix } }); setFeedback(["Issue branch prefix updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, branchPrefix]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Issue Branch Prefix"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Issue Branch Prefix">
      <div className="card"><div className="card-body">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Define branch prefix for issues to auto-link branches.</div>
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="mb-3"><label className="form-label">Branch Prefix</label><input className="form-control" value={branchPrefix} onChange={e => setBranchPrefix(e.target.value)} placeholder="e.g. issue/" /></div>
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>);
}
