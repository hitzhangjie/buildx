import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { fetchProjects, fetchProject, updateProject } from "../../../api/projects";

export default function ServiceDeskSettingPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProject(projectId).then(p => { if (!c) { setEmail(p.serviceDeskEmailAddress ?? ""); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProject(projectId, { name: "", serviceDeskEmailAddress: email }); setFeedback(["Service desk settings updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, email]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Service Desk"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Service Desk">
      <div className="card"><div className="card-body">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Configure service desk email to create issues from incoming emails.</div>
        <FormFeedbackPanel messages={feedback} />
        <form className="leave-confirm" onSubmit={save}>
          <div className="mb-3"><label className="form-label">Service Desk Email Address</label><input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="service-desk@example.com" /></div>
          <button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </form>
      </div></div>
    </SettingsLayout>);
}
