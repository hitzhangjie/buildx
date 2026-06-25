import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type BuildPreservation } from "../../../api/projects";

export default function BuildPreservationsPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<BuildPreservation[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setItems(s.buildSetting?.buildPreservations ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (list: BuildPreservation[]) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { buildSetting: { buildPreservations: list } }); setFeedback(["Build preserve rules updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);
  const add = () => setItems([...items, { condition: "", count: 10 }]);
  const upd = (i: number, f: Partial<BuildPreservation>) => { const a = [...items]; a[i] = { ...a[i], ...f }; setItems(a); };
  const del = (i: number) => { const list = items.filter((_, idx) => idx !== i); setItems(list); saveAll(list); };

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Build Preserve Rules"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Build Preserve Rules">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <div className="mb-3"><a className="btn btn-primary" onClick={add} role="button"><Icon name="plus" className="mr-1" /> Add Rule</a></div>
        <table className="table"><thead><tr><th>Condition</th><th>Count</th><th></th></tr></thead><tbody>
          {items.map((r, i) => (<tr key={i}><td><input className="form-control form-control-sm" value={r.condition} onChange={e => upd(i, { condition: e.target.value })} placeholder="e.g. status=failed" /></td><td><input className="form-control form-control-sm" type="number" value={r.count} onChange={e => upd(i, { count: parseInt(e.target.value) || 0 })} style={{width:100}} /></td><td><a className="btn btn-sm btn-light-danger" onClick={() => del(i)} role="button"><Icon name="trash" /></a></td></tr>))}
        </tbody></table>
        <button className="btn btn-primary dirty-aware" onClick={() => saveAll(items)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div></div>
    </SettingsLayout>);
}
