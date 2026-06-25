import { useCallback, useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../../components/onedev/Icon";
import { fetchProjects, fetchProjectSettings, updateProjectSettings, type DefaultFixedIssueFilter } from "../../../api/projects";

export default function DefaultFixedIssueFiltersPage() {
  const { projectPath } = useProject();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [filters, setFilters] = useState<DefaultFixedIssueFilter[]>([]);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [feedback, setFeedback] = useState<string[]>([]);

  useEffect(() => { let c = false; fetchProjects().then(ps => { if (!c) { const f = ps.find(p => p.path === projectPath); setProjectId(f?.id ?? null); } }).catch(() => {}); return () => { c = true; }; }, [projectPath]);
  useEffect(() => { if (projectId === null) return; let c = false; setLoading(true); fetchProjectSettings(projectId).then(s => { if (!c) { setFilters(s.buildSetting?.defaultFixedIssueFilters ?? []); setLoading(false); } }).catch(() => { if (!c) setLoading(false); }); return () => { c = true; }; }, [projectId]);

  const saveAll = useCallback(async (list: DefaultFixedIssueFilter[]) => { setSaving(true); setFeedback([]); try { await updateProjectSettings(projectId!, { buildSetting: { defaultFixedIssueFilters: list } }); setFeedback(["Fixed issue filters updated."]); } catch (err: unknown) { setFeedback([err instanceof Error ? err.message : String(err)]); } finally { setSaving(false); } }, [projectId]);
  const add = () => setFilters([...filters, { query: "" }]);
  const upd = (i: number, q: string) => { const a = [...filters]; a[i] = { query: q }; setFilters(a); };
  const del = (i: number) => { const list = filters.filter((_, idx) => idx !== i); setFilters(list); saveAll(list); };

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Default Fixed Issue Filters"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Default Fixed Issue Filters">
      <div className="card"><div className="card-body">
        <FormFeedbackPanel messages={feedback} />
        <div className="mb-3"><a className="btn btn-primary" onClick={add} role="button"><Icon name="plus" className="mr-1" /> Add Filter</a></div>
        <table className="table"><thead><tr><th>Query</th><th></th></tr></thead><tbody>
          {filters.map((f, i) => (<tr key={i}><td><input className="form-control form-control-sm" value={f.query} onChange={e => upd(i, e.target.value)} /></td><td><a className="btn btn-sm btn-light-danger" onClick={() => del(i)} role="button"><Icon name="trash" /></a></td></tr>))}
        </tbody></table>
        <button className="btn btn-primary dirty-aware" onClick={() => saveAll(filters)} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </div></div>
    </SettingsLayout>);
}
