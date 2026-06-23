import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev IncompatibilitiesPage.html.
 * Reference: references/onedev/.../web/page/help/IncompatibilitiesPage.html
 */
export function IncompatibilitiesPage() {
  return (
    <Layout title="Incompatibilities">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Browser Compatibility</h5>
          </div>
          <div className="card-body">
            <div className="alert alert-warning d-flex align-items-center">
              <Icon name="warning" className="icon mr-3" width={24} height={24} />
              <span>
                Some features of BuildX may not be available in all browsers. Please use a
                modern browser for the best experience.
              </span>
            </div>

            <h6 className="mt-4">Supported Browsers</h6>
            <ul>
              <li>Google Chrome (latest 2 major versions)</li>
              <li>Mozilla Firefox (latest 2 major versions)</li>
              <li>Apple Safari (latest 2 major versions)</li>
              <li>Microsoft Edge (latest 2 major versions)</li>
            </ul>

            <h6 className="mt-4">Unsupported Features by Browser</h6>
            <table className="table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Chrome</th>
                  <th>Firefox</th>
                  <th>Safari</th>
                  <th>Edge</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Real-time updates (SSE)</td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                </tr>
                <tr>
                  <td>WebSocket</td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                </tr>
                <tr>
                  <td>Clipboard API</td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                  <td><Icon name="cross" className="icon text-danger" width={16} height={16} /></td>
                  <td><Icon name="check" className="icon text-success" width={16} height={16} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
