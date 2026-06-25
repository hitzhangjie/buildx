import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type CodeAnalysisSetting } from "../../../api/projects";

export default function CodeAnalysisSettingPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [settings, setSettings] = useState<CodeAnalysisSetting>({});
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setSettings(s.codeAnalysisSetting ?? {}); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { codeAnalysisSetting: settings }); setFeedback(["Code analysis settings updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, settings]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Code Analysis"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Code Analysis">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="mb-3"><label className="form-label">Analysis Files</label><textarea className="form-control" rows={5} value={settings.analysisFiles ?? ""} onChange={e => setSettings({ ...settings, analysisFiles: e.target.value })} placeholder="File patterns to analyze, one per line" /></div>
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>);
}
