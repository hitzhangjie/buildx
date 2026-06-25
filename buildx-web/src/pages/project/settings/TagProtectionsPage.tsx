import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type TagProtection } from "../../../api/projects";

export default function TagProtectionsPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [items, setItems] = useState<TagProtection[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setItems(s.tagProtections ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const toggle = (i: number) => { const s = new Set(expanded); s.has(i) ? s.delete(i) : s.add(i); setExpanded(s); };
  const add = () => setItems([...items, { enabled: true, tags: "", preventUpdate: false, preventDeletion: false, preventCreation: false, commitSignatureRequired: false }]);
  const upd = (i: number, f: Partial<TagProtection>) => { const a = [...items]; a[i] = { ...a[i], ...f }; setItems(a); };
  const del = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = useCallback(async (e: React.FormEvent) => { e.preventDefault(); if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { tagProtections: items }); setFeedback(["Tag protections updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, items]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Tag Protection"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Tag Protection">
      <div className="tag-protections">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray"><Icon name="bulb" className="mr-2" /> Define tag protection rules.</div>
        <FormFeedbackPanel messages={feedback} />
        <form onSubmit={save}><div className="body"><ul className="list-unstyled">{items.map((p, i) => (
          <li key={i} className="protection mb-5"><div className={"tag-protection card" + (expanded.has(i) ? " expanded" : "")}>
            <div className="card-header d-flex align-items-center" onClick={() => toggle(i)} role="button"><span className="toggle mr-2"><Icon name={expanded.has(i) ? "chevron-down" : "chevron-right"} className="icon" /></span><span className="badge badge-light mr-2">Rule {i + 1}</span><span className="text-truncate">{p.tags || "New rule"}</span><a className="btn btn-sm btn-light-danger ml-auto" onClick={e => { e.stopPropagation(); del(i); }}><Icon name="trash" /></a></div>
            <div className="card-body">
              <div className="mb-3"><label className="form-label">Tag Pattern</label><input className="form-control" value={p.tags} onChange={e => upd(i, { tags: e.target.value })} placeholder="e.g. v*" /></div>
              <div className="mb-3"><label className="form-label">User Match</label><input className="form-control" value={p.userMatch ?? ""} onChange={e => upd(i, { userMatch: e.target.value })} /></div>
              <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={p.preventUpdate} onChange={e => upd(i, { preventUpdate: e.target.checked })} id={`tu-${i}`} /><label className="form-check-label" htmlFor={`tu-${i}`}>Prevent update</label></div>
              <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={p.preventDeletion} onChange={e => upd(i, { preventDeletion: e.target.checked })} id={`td-${i}`} /><label className="form-check-label" htmlFor={`td-${i}`}>Prevent deletion</label></div>
              <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={p.preventCreation} onChange={e => upd(i, { preventCreation: e.target.checked })} id={`tc-${i}`} /><label className="form-check-label" htmlFor={`tc-${i}`}>Prevent creation</label></div>
              <div className="form-check mb-2"><input className="form-check-input" type="checkbox" checked={p.commitSignatureRequired} onChange={e => upd(i, { commitSignatureRequired: e.target.checked })} id={`tcs-${i}`} /><label className="form-check-label" htmlFor={`tcs-${i}`}>Require commit signature</label></div>
            </div>
          </div></li>
        ))}</ul><div className="card"><div className="card-header"><a className="d-flex align-items-center add-new" onClick={add} role="button"><Icon name="plus-circle-o" className="mr-2" /> Add Rule</a></div></div></div>
        <div className="mt-4"><button type="submit" className="btn btn-primary dirty-aware" disabled={saving}>{saving ? "Saving..." : "Save"}</button></div></form>
      </div>
    </SettingsLayout>);
}
