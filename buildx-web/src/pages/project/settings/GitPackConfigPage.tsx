import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type GitPackConfig } from "../../../api/projects";

export default function GitPackConfigPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [config, setConfig] = useState<GitPackConfig>({});
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setConfig(s.gitPackConfig ?? {}); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { gitPackConfig: config }); setFeedback(["Git pack config updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, config]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Git Pack Config"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Git Pack Config">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="mb-3"><label className="form-label">Window Memory</label><input className="form-control" value={config.windowMemory ?? ""} onChange={e => setConfig({ ...config, windowMemory: e.target.value })} placeholder="e.g. 512m" /></div>
          <div className="mb-3"><label className="form-label">Pack Size Limit</label><input className="form-control" value={config.packSizeLimit ?? ""} onChange={e => setConfig({ ...config, packSizeLimit: e.target.value })} placeholder="e.g. 2g" /></div>
          <div className="mb-3"><label className="form-label">Threads</label><input className="form-control" value={config.threads ?? ""} onChange={e => setConfig({ ...config, threads: e.target.value })} placeholder="e.g. 4" /></div>
          <div className="mb-3"><label className="form-label">Window</label><input className="form-control" value={config.window ?? ""} onChange={e => setConfig({ ...config, window: e.target.value })} /></div>
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>);
}
