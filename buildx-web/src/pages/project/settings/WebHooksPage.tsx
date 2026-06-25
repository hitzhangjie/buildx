import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type WebHook } from "../../../api/projects";

export default function WebHooksPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [webhooks, setWebhooks] = useState<WebHook[]>([]);
  const [loading, setLoading] = useState(true); const [_saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);
  const [editing, setEditing] = useState<WebHook | null>(null); const [nextId, setNextId] = useState(1);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { const ws = s.webHooks ?? []; setWebhooks(ws); if (ws.length > 0) setNextId(Math.max(...ws.map(w => w.id)) + 1); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (list: WebHook[]) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { webHooks: list }); setFeedback(["Webhooks updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);

  const addNew = () => setEditing({ id: nextId, postUrl: "", eventTypes: [], enabled: true });
  const edit = (w: WebHook) => setEditing({ ...w });
  const saveEdit = () => { if (!editing) return; const list = [...webhooks]; const idx = list.findIndex(w => w.id === editing.id); if (idx >= 0) list[idx] = editing; else { list.push(editing); setNextId(n => n + 1); } setWebhooks(list); setEditing(null); saveAll(list); };
  const del = (id: number) => { const list = webhooks.filter(w => w.id !== id); setWebhooks(list); saveAll(list); };
  const toggleEnabled = (id: number) => { const list = webhooks.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w); setWebhooks(list); saveAll(list); };
  const toggleEventType = (et: string) => { if (!editing) return; const types = editing.eventTypes.includes(et) ? editing.eventTypes.filter(t => t !== et) : [...editing.eventTypes, et]; setEditing({ ...editing, eventTypes: types }); };

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Web Hooks"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Web Hooks">
      <div className="web-hooks">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Configure webhooks triggered by project events.</div>
        <div className="card"><div className="card-body">
          <FormFeedbackPanel messages={feedback} />
          <div className="mb-3"><a className="btn btn-primary" onClick={addNew} role="button"><Icon name="plus" className="mr-1" /> Add Webhook</a></div>
          <table className="table"><thead><tr><th>URL</th><th>Event Types</th><th>Enabled</th><th></th></tr></thead><tbody>
            {webhooks.map(w => (<tr key={w.id}><td>{w.postUrl}</td><td>{w.eventTypes.join(", ")}</td><td><span className={"badge " + (w.enabled ? "badge-success" : "badge-secondary")}>{w.enabled ? "On" : "Off"}</span></td><td>
              <a className="btn btn-sm btn-light mr-1" onClick={() => edit(w)} role="button"><Icon name="edit" /></a>
              <a className="btn btn-sm btn-light mr-1" onClick={() => toggleEnabled(w.id)} role="button"><Icon name={w.enabled ? "toggle-off" : "toggle-on"} /></a>
              <a className="btn btn-sm btn-light-danger" onClick={() => del(w.id)} role="button"><Icon name="trash" /></a>
            </td></tr>))}
          </tbody></table>
        </div></div>
      </div>
      {editing && (<div className="modal d-block fade show" tabIndex={-1} role="dialog"><div className="modal-dialog"><div className="modal-content">
        <div className="modal-header"><h5 className="modal-title">{webhooks.find(w => w.id === editing.id) ? "Edit" : "Add"} Webhook</h5></div>
        <div className="modal-body">
          <div className="mb-3"><label className="form-label">Post URL</label><input className="form-control" value={editing.postUrl} onChange={e => setEditing({ ...editing, postUrl: e.target.value })} /></div>
          <div className="mb-3"><label className="form-label">Secret</label><input className="form-control" value={editing.secret ?? ""} onChange={e => setEditing({ ...editing, secret: e.target.value })} /></div>
          <div className="mb-3"><label className="form-label">Event Types</label>
            {["CODE_PUSH", "PULL_REQUEST", "ISSUE", "CODE_COMMENT", "BUILD", "PACKAGE"].map(et => (<div key={et} className="form-check"><input className="form-check-input" type="checkbox" checked={editing.eventTypes.includes(et)} onChange={() => toggleEventType(et)} id={`et-${et}`} /><label className="form-check-label" htmlFor={`et-${et}`}>{et}</label></div>))}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={saveEdit} disabled={!editing.postUrl}>Save</button></div>
      </div></div></div>)}
      {editing && <div className="modal-backdrop fade show" onClick={() => setEditing(null)} />}
    </SettingsLayout>);
}
