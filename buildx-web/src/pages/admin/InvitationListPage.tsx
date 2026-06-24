import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyListState } from "../../components/global-list/EmptyListState";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";
import {
  type Invitation,
  deleteInvitation,
  listInvitations,
  resendInvitation,
} from "../../api/invitations";
import "./invitation-list-page.css";

/**
 * Mirrors OneDev InvitationListPage.html.
 * Reference: references/onedev/.../web/page/admin/invitation/InvitationListPage.html
 */
export function InvitationListPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  const loadInvitations = useCallback(async () => {
    setErrors([]);
    try {
      setLoading(true);
      const result = await listInvitations();
      setInvitations(result);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to query invitations"]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const filteredInvitations = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) {
      return invitations;
    }
    return invitations.filter((it) => {
      const email = it.emailAddress.toLowerCase();
      const status = it.status.toLowerCase();
      return email.includes(query) || status.includes(query);
    });
  }, [filterText, invitations]);

  async function handleResend(id: number) {
    setErrors([]);
    try {
      await resendInvitation(id);
      await loadInvitations();
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to resend invitation"]);
    }
  }

  async function handleDelete(id: number) {
    setErrors([]);
    try {
      await deleteInvitation(id);
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
    <Layout title="Invitations" topbarTitle="Invitations">
      <div className="m-2 m-sm-5">
        <div className="card invitation-list">
          <div className="card-body">
            <div className="d-flex align-items-center mb-4">
              <div className="clearable-wrapper flex-grow-1 mr-3">
                <input
                  className="form-control search"
                  placeholder="Filter..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
              </div>
              <Link
                to="/~administration/invitations/new"
                className="btn btn-icon btn-primary flex-shrink-0"
                aria-label="New invitation"
              >
                <Icon name="plus" className="icon" width={16} height={16} />
              </Link>
            </div>

            <FormFeedbackPanel messages={errors} />

            {!loading && filteredInvitations.length === 0 && (
              <EmptyListState message="No invitations" />
            )}

            {(loading || filteredInvitations.length > 0) && (
              <table className="table table-hover invitations">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invited At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">
                        Loading invitations...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredInvitations.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.emailAddress}</td>
                      <td>{statusBadge(inv.status)}</td>
                      <td>{inv.createdAt ?? "-"}</td>
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
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
