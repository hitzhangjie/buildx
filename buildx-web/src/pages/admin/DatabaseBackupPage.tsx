import { useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Backup = {
  id: number;
  fileName: string;
  fileSize: string;
  createdDate: string;
};

/**
 * Mirrors OneDev DatabaseBackupPage.html.
 * Reference: references/onedev/.../web/page/admin/backup/DatabaseBackupPage.html
 */
export function DatabaseBackupPage() {
  const [backups, setBackups] = useState<Backup[]>([
    { id: 1, fileName: "backup-20260623.sqlite", fileSize: "128 MB", createdDate: "2026-06-23 03:00" },
    { id: 2, fileName: "backup-20260622.sqlite", fileSize: "127 MB", createdDate: "2026-06-22 03:00" },
    { id: 3, fileName: "backup-20260621.sqlite", fileSize: "126 MB", createdDate: "2026-06-21 03:00" },
  ]);
  const [backingUp, setBackingUp] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleBackupNow() {
    setErrors([]);
    setBackingUp(true);
    try {
      // TODO: wire to API
      const newBackup: Backup = {
        id: Date.now(),
        fileName: `backup-${new Date().toISOString().slice(0, 10)}.sqlite`,
        fileSize: "128 MB",
        createdDate: new Date().toLocaleString(),
      };
      setBackups((prev) => [newBackup, ...prev]);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Backup failed"]);
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <Layout title="Database Backup">
      <div className="container m-2 m-sm-5">
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Database Backup</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <p>
              Create a backup of the database. Backups are stored on the server filesystem.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleBackupNow}
              disabled={backingUp}
            >
              <Icon name="download" className="icon mr-1" width={16} height={16} />
              {backingUp ? "Backing up..." : "Backup Now"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Backup History</h5>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>File Size</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No backups yet
                    </td>
                  </tr>
                )}
                {backups.map((backup) => (
                  <tr key={backup.id}>
                    <td><code>{backup.fileName}</code></td>
                    <td>{backup.fileSize}</td>
                    <td>{backup.createdDate}</td>
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
