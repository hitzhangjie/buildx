import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type WorkspaceSpec } from "../../../api/projects";

export default function WorkspaceSpecsPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [specs, setSpecs] = useState<WorkspaceSpec[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setSpecs(s.workspaceSpecs ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const toggle = (i: number) => { const s = new Set(expanded); s.has(i) ? s.delete(i) : s.add(i); setExpanded(s); };
  const add = () => setSpecs([...specs, { name: "", image: "" }]);
  const upd = (i: number, f: Partial<WorkspaceSpec>) => { const a = [...specs]; a[i] = { ...a[i], ...f }; setSpecs(a); };
  const del = (i: number) => setSpecs(specs.filter((_, idx) => idx !== i));
  const save = useCallback(async () => { if (projectId === null) return; setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId, { workspaceSpecs: specs }); setFeedback(["Workspace specs updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId, specs]);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Workspace Specs"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Workspace Specs">
      <div className="workspace-specs"><FormFeedbackPanel messages={feedback} />
        <ul className="list-unstyled">{specs.map((s, i) => (<li key={i} className="mb-5"><div className={"workspace-spec card" + (expanded.has(i) ? " expanded" : "")}>
          <div className="card-header d-flex align-items-center" onClick={() => toggle(i)} role="button"><span className="toggle mr-2"><Icon name={expanded.has(i) ? "chevron-down" : "chevron-right"} className="icon" /></span><span className="badge badge-light mr-2">Spec {i + 1}</span><span className="text-truncate">{s.name || "New spec"}</span><a className="btn btn-sm btn-light-danger ml-auto" onClick={e => { e.stopPropagation(); del(i); }}><Icon name="trash" /></a></div>
          <div className="card-body">
            <div className="mb-3"><label className="form-label">Name</label><input className="form-control" value={s.name} onChange={e => upd(i, { name: e.target.value })} /></div>
            <div className="mb-3"><label className="form-label">Image</label><input className="form-control" value={s.image} onChange={e => upd(i, { image: e.target.value })} /></div>
            <div className="mb-3"><label className="form-label">Shell</label><input className="form-control" value={s.shell ?? ""} onChange={e => upd(i, { shell: e.target.value })} /></div>
          </div>
        </div></li>))}</ul>
        <div className="card"><div className="card-header"><a className="d-flex align-items-center add-new" onClick={add} role="button"><Icon name="plus-circle-o" className="mr-2" /> Add Spec</a></div></div>
        <div className="mt-4"><button className="btn btn-primary dirty-aware" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</button></div>
      </div>
    </SettingsLayout>);
}
