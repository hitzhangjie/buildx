import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type AiSetting } from "../../../api/projects";

export default function ProjectAiSettingPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [ai, setAi] = useState<AiSetting>({ enabled: false });
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setAi(s.aiSetting ?? { enabled: false }); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { aiSetting: ai }); setFeedback(["AI settings updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, ai]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="AI Settings"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="AI Settings">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="form-check form-switch mb-3"><input className="form-check-input" type="checkbox" checked={ai.enabled} onChange={e => setAi({ ...ai, enabled: e.target.checked })} id="ai-enabled" /><label className="form-check-label" htmlFor="ai-enabled">Enable AI Features</label></div>
          {ai.enabled && (<div className="mb-3"><label className="form-label">Model</label><input className="form-control" value={ai.model ?? ""} onChange={e => setAi({ ...ai, model: e.target.value })} placeholder="e.g. gpt-4" /></div>)}
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>);
}
