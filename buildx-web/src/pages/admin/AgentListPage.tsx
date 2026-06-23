import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Agent = {
  name: string;
  status: "Online" | "Offline";
  os: string;
  arch: string;
  cpu: string;
  memory: string;
};

const MOCK_AGENTS: Agent[] = [
  { name: "agent-01", status: "Online", os: "Linux", arch: "x86_64", cpu: "4 vCPU", memory: "8 GB" },
  { name: "agent-02", status: "Online", os: "Linux", arch: "arm64", cpu: "8 vCPU", memory: "16 GB" },
  { name: "agent-03", status: "Offline", os: "macOS", arch: "x86_64", cpu: "2 vCPU", memory: "4 GB" },
];

/**
 * Mirrors OneDev AgentListPage.html.
 * Reference: references/onedev/.../web/page/admin/agent/AgentListPage.html
 */
export function AgentListPage() {
  const agents = MOCK_AGENTS;

  return (
    <Layout title="Agents">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Agents</h5>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>OS</th>
                  <th>Arch</th>
                  <th>CPU</th>
                  <th>Memory</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.name}>
                    <td>
                      <Link to={`/~administration/agents/${agent.name}`}>
                        {agent.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          agent.status === "Online" ? "badge-success" : "badge-secondary"
                        }`}
                      >
                        <Icon
                          name={agent.status === "Online" ? "check" : "cross"}
                          className="icon mr-1"
                          width={12}
                          height={12}
                        />
                        {agent.status}
                      </span>
                    </td>
                    <td>{agent.os}</td>
                    <td>{agent.arch}</td>
                    <td>{agent.cpu}</td>
                    <td>{agent.memory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
