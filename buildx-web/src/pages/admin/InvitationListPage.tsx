import { useState } from "react";
import { Link } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Invitation = {
  id: number;
  email: string;
  status: "pending" | "accepted" | "expired";
  sentDate: string;
};

/**
 * Mirrors OneDev InvitationListPage.html.
 * Reference: references/onedev/.../web/page/admin/invitation/InvitationListPage.html
 */
export function InvitationListPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([
    { id: 1, email: "newuser@example.com", status: "pending", sentDate: "2026-06-20" },
    { id: 2, email: "invited@example.com", status: "accepted", sentDate: "2026-06-15" },
    { id: 3, email: "expired@example.com", status: "expired", sentDate: "2025-12-01" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleResend(_id: number) {
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to resend invitation"]);
    }
  }

  function handleDelete(id: number) {
    try {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to delete invitation"]);
    }
  }

  const statusBadge = (status: Invitation["status"]) => {
    switch (status) {
      case "pending":
        return <span className="badge badge-warning">Pending</span>;
      case "accepted":
        return <span className="badge badge-success">Accepted</span>;
      case "expired":
        return <span className="badge badge-secondary">Expired</span>;
    }
  };

  return (
    <Layout title="Invitations">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Invitations</h5>
            <Link to="/~administration/invitations/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New Invitation
            </Link>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Sent Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No invitations
                    </td>
                  </tr>
                )}
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td>{inv.sentDate}</td>
                    <td>
                      <button
                        className="btn btn-link btn-sm mr-1"
                        onClick={() => handleResend(inv.id)}
                      >
                        <Icon name="refresh" className="icon mr-1" width={14} height={14} />
                        Resend
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(inv.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Delete
                      </button>
                    </td>
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
