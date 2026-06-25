import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings } from "../../../api/projects";

export default function ProjectStateTransitionListPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [transitions, setTransitions] = useState<{fromStates: string[]; toState: string; trigger?: string; authorized?: string}[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setTransitions(s.issueSetting?.transitionSpecs ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (list: typeof transitions) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { issueSetting: { transitionSpecs: list } }); setFeedback(["State transitions updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);
  const add = () => setTransitions([...transitions, { fromStates: [], toState: "" }]);
  const updFrom = (i: number, val: string) => { const a = [...transitions]; a[i] = { ...a[i], fromStates: val.split(",").map(s => s.trim()).filter(Boolean) }; setTransitions(a); };
  const updTo = (i: number, val: string) => { const a = [...transitions]; a[i] = { ...a[i], toState: val }; setTransitions(a); };
  const del = (i: number) => { const list = transitions.filter((_, idx) => idx !== i); setTransitions(list); saveAll(list); };

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="State Transitions"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="State Transitions">
      <div className="card"><div className="card-body">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Define custom state transitions for issues in this project.</div>
        <FormFeedbackPanel messages={feedback} />
        <div className="mb-3"><a className="btn btn-primary" onClick={add} role="button"><Icon name="plus" className="mr-1" /> Add Transition</a></div>
        <table className="table"><thead><tr><th>From States</th><th>To State</th><th></th></tr></thead><tbody>
          {transitions.map((t, i) => (<tr key={i}><td><input className="form-control form-control-sm" value={t.fromStates.join(", ")} onChange={e => updFrom(i, e.target.value)} placeholder="e.g. Open, In Progress" /></td><td><input className="form-control form-control-sm" value={t.toState} onChange={e => updTo(i, e.target.value)} /></td><td><a className="btn btn-sm btn-light-danger" onClick={() => del(i)} role="button"><Icon name="trash" /></a></td></tr>))}
        </tbody></table>
        <button className="btn btn-primary dirty-aware" onClick={() => saveAll(transitions)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div></div>
    </SettingsLayout>);
}
