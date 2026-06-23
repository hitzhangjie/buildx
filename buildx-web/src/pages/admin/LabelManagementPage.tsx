import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Label = {
  id: number;
  name: string;
  color: string;
};

const COLORS = [
  "#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8",
  "#6f42c1", "#fd7e14", "#20c997", "#e83e8c", "#6c757d",
];

/**
 * Mirrors OneDev LabelManagementPage.html.
 * Reference: references/onedev/.../web/page/admin/label/LabelManagementPage.html
 */
export function LabelManagementPage() {
  const [labels, setLabels] = useState<Label[]>([
    { id: 1, name: "bug", color: "#dc3545" },
    { id: 2, name: "enhancement", color: "#28a745" },
    { id: 3, name: "question", color: "#17a2b8" },
    { id: 4, name: "documentation", color: "#6f42c1" },
    { id: 5, name: "duplicate", color: "#6c757d" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setName("");
    setColor(COLORS[0]);
    setShowAdd(false);
    setEditId(null);
  }

  function handleEdit(label: Label) {
    setEditId(label.id);
    setName(label.name);
    setColor(label.color);
    setShowAdd(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      if (editId) {
        setLabels((prev) =>
          prev.map((l) => (l.id === editId ? { ...l, name: name.trim(), color } : l))
        );
      } else {
        setLabels((prev) => [...prev, { id: Date.now(), name: name.trim(), color }]);
      }
      resetForm();
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save label"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: number) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <Layout title="Labels">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Labels</h5>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetForm();
                setShowAdd(!showAdd);
              }}
            >
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              {showAdd ? "Cancel" : "Add Label"}
            </button>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            {showAdd && (
              <form method="post" onSubmit={handleSubmit} className="mb-4">
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="control-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Label name"
                      required
                    />
                  </div>
                  <div className="form-group col-md-4">
                    <label className="control-label">Color</label>
                    <div className="d-flex flex-wrap gap-1">
                      {COLORS.map((c) => (
                        <div
                          key={c}
                          className="border rounded"
                          style={{
                            width: 28,
                            height: 28,
                            background: c,
                            cursor: "pointer",
                            outline: color === c ? "2px solid #333" : undefined,
                            outlineOffset: 2,
                          }}
                          onClick={() => setColor(c)}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="form-group col-md-2 d-flex align-items-end">
                    <button
                      className="btn btn-primary btn-block"
                      type="submit"
                      disabled={submitting}
                    >
                      <Icon name="check" className="icon mr-1" width={14} height={14} />
                      {editId ? "Update" : "Add"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="d-flex flex-wrap">
              {labels.length === 0 && (
                <div className="text-center text-muted w-100 py-4">
                  No labels defined
                </div>
              )}
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="d-flex align-items-center border rounded p-2 mr-2 mb-2"
                >
                  <span
                    className="badge mr-2"
                    style={{
                      background: label.color,
                      color: "#fff",
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    {label.name}
                  </span>
                  <button
                    className="btn btn-link btn-sm p-0 mr-1"
                    onClick={() => handleEdit(label)}
                    title="Edit"
                  >
                    <Icon name="pencil" className="icon" width={14} height={14} />
                  </button>
                  <button
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() => handleDelete(label.id)}
                    title="Delete"
                  >
                    <Icon name="trash" className="icon" width={14} height={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
