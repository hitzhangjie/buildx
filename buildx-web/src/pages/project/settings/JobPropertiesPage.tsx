import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type JobProperty } from "../../../api/projects";

export default function JobPropertiesPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [props, setProps] = useState<JobProperty[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setProps(s.buildSetting?.jobProperties ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (items: JobProperty[]) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { buildSetting: { jobProperties: items } }); setFeedback(["Job properties updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);

  const add = () => setProps([...props, { name: "", value: "" }]);
  const upd = (i: number, f: Partial<JobProperty>) => { const a = [...props]; a[i] = { ...a[i], ...f }; setProps(a); };
  const del = (i: number) => { const items = props.filter((_, idx) => idx !== i); setProps(items); saveAll(items); };

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Job Properties"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Job Properties">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <div className="mb-3"><a className="btn btn-primary" onClick={add} role="button"><Icon name="plus" className="mr-1" /> Add Property</a></div>
        <table className="table"><thead><tr><th>Name</th><th>Value</th><th></th></tr></thead><tbody>
          {props.map((p, i) => (<tr key={i}><td><input className="form-control form-control-sm" value={p.name} onChange={e => upd(i, { name: e.target.value })} /></td><td><input className="form-control form-control-sm" value={p.value} onChange={e => upd(i, { value: e.target.value })} /></td><td><a className="btn btn-sm btn-light-danger" onClick={() => del(i)} role="button"><Icon name="trash" /></a></td></tr>))}
        </tbody></table>
        <button className="btn btn-primary dirty-aware" onClick={() => saveAll(props)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div></div>
    </SettingsLayout>);
}
