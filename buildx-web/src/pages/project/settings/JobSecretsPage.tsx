import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type JobSecret } from "../../../api/projects";

export default function JobSecretsPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [secrets, setSecrets] = useState<JobSecret[]>([]);
  const [loading, setLoading] = useState(true); const [_saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null); const [editName, setEditName] = useState(""); const [editValue, setEditValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setSecrets(s.buildSetting?.jobSecrets ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (items: JobSecret[]) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { buildSetting: { jobSecrets: items } }); setFeedback(["Job secrets updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);

  const add = () => { setEditing(-1); setEditName(""); setEditValue(""); };
  const edit = (i: number) => { setEditing(i); setEditName(secrets[i].name); setEditValue(secrets[i].value ?? ""); };
  const saveEdit = () => { const items = [...secrets]; const s: JobSecret = { name: editName, value: editValue, archived: false }; if (editing! >= 0 && editing! < items.length) items[editing!] = { ...items[editing!], name: editName, value: editValue }; else items.push(s); setSecrets(items); setEditing(null); saveAll(items); };
  const del = (i: number) => { const items = secrets.filter((_, idx) => idx !== i); setSecrets(items); saveAll(items); };
  const toggleArchive = (i: number) => { const items = [...secrets]; items[i] = { ...items[i], archived: !items[i].archived }; setSecrets(items); saveAll(items); };

  const visible = showArchived ? secrets : secrets.filter(s => !s.archived);
  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Job Secrets"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Job Secrets">
      <div className="card job-secrets"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <div className="mb-4">
          <a className="btn btn-primary" onClick={add} role="button"><Icon name="plus" className="mr-1" /> Add New</a>
          <a className="btn btn-light-primary ml-2" onClick={() => setShowArchived(!showArchived)} role="button"><Icon name="archive" className="mr-1" /> {showArchived ? "Hide" : "Show"} Archived</a>
        </div>
        <table className="table"><thead><tr><th>Name</th><th>Actions</th></tr></thead><tbody>
          {visible.map((s, i) => (
            <tr key={i}><td>{s.name}{s.archived ? <span className="badge badge-warning ml-2">Archived</span> : null}</td><td>
              <a className="btn btn-sm btn-light mr-1" onClick={() => edit(i)} role="button"><Icon name="edit" /></a>
              <a className="btn btn-sm btn-light mr-1" onClick={() => toggleArchive(i)} role="button"><Icon name={s.archived ? "undo" : "archive"} /></a>
              <a className="btn btn-sm btn-light-danger" onClick={() => del(i)} role="button"><Icon name="trash" /></a>
            </td></tr>
          ))}
        </tbody></table>
        {editing !== null && (
          <div className="modal d-block fade show job-secret-edit" tabIndex={-1} role="dialog"><div className="modal-dialog"><div className="modal-content">
            <div className="modal-header"><h5 className="modal-title">{editing >= 0 ? "Edit" : "Add"} Job Secret</h5></div>
            <div className="modal-body">
              <div className="mb-3"><label className="form-label">Name</label><input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="mb-3"><label className="form-label">Value</label><textarea className="form-control" rows={4} value={editValue} onChange={e => setEditValue(e.target.value)} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-primary" onClick={saveEdit} disabled={!editName}>Save</button></div>
          </div></div></div>
        )}
        {editing !== null && <div className="modal-backdrop fade show" onClick={() => setEditing(null)} />}
      </div></div>
    </SettingsLayout>);
}
