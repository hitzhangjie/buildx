import { type FormEvent, useState } from "react";
import { useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Member = {
  id: number;
  name: string;
  role: string;
};

/**
 * Mirrors OneDev GroupProfilePage.html.
 * Reference: references/onedev/.../web/page/admin/group/GroupProfilePage.html
 */
export function GroupProfilePage() {
  const { groupName } = useParams<{ groupName: string }>();

  const [name, setName] = useState(groupName || "Developers");
  const [description, setDescription] = useState("All developers in the organization");
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "admin", role: "Administrator" },
    { id: 2, name: "dev1", role: "Developer" },
    { id: 3, name: "dev2", role: "Developer" },
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveGroup(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save group"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddMember() {
    if (!newMemberName.trim()) return;
    try {
      // TODO: wire to API
      const member: Member = {
        id: Date.now(),
        name: newMemberName.trim(),
        role: "Developer",
      };
      setMembers((prev) => [...prev, member]);
      setNewMemberName("");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to add member"]);
    }
  }

  function handleRemoveMember(id: number) {
    try {
      // TODO: wire to API
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to remove member"]);
    }
  }

  return (
    <Layout title={name}>
      <div className="container m-2 m-sm-5">
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Group Information</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSaveGroup}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="control-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <span className="text-muted">Members: </span>
                <span className="badge badge-info">{members.length}</span>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="check" className="icon mr-1" width={16} height={16} />
                Save
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Members</h5>
          </div>
          <div className="card-body">
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter username to add"
              />
              <div className="input-group-append">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={handleAddMember}
                >
                  <Icon name="plus" className="icon mr-1" width={14} height={14} />
                  Add
                </button>
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No members
                    </td>
                  </tr>
                )}
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.role}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Remove
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
