import { useEffect, useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";

export default function GroupAuthorizationsPage() {
  const { projectPath } = useProject();
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(false); }, []);

  if (loading) return <SettingsLayout projectPath={projectPath} pageTitle="Group Authorizations"><div className="card"><div className="card-body text-center py-5">Loading...</div></div></SettingsLayout>;
  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Group Authorizations">
      <div className="card"><div className="card-body">
        <div className="alert alert-notice bg-white shadow mb-5 text-gray">Group authorizations will be available when groups are implemented.</div>
      </div></div>
    </SettingsLayout>);
}
