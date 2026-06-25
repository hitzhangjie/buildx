import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { Pack, PackLabel } from "../../../api/packs";
import { deletePack, createPackLabel, deletePackLabel } from "../../../api/packs";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function formatAge(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

interface PackSidePanelProps {
  pack: Pack;
  canWrite?: boolean;
  onDeleted?: () => void;
  onLabelsChanged?: (labels: PackLabel[]) => void;
}

export function PackSidePanel({
  pack,
  canWrite = false,
  onDeleted,
  onLabelsChanged,
}: PackSidePanelProps) {
  const [deleting, setDeleting] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<PackLabel[]>(pack.labels ?? []);

  const handleDelete = useCallback(async () => {
    if (!confirm("Do you really want to delete this package?")) return;
    setDeleting(true);
    try {
      await deletePack(pack.id);
      onDeleted?.();
    } catch {
      setDeleting(false);
    }
  }, [pack.id, onDeleted]);

  const handleAddLabel = useCallback(async () => {
    const trimmed = labelInput.trim();
    if (!trimmed || labels.some((l) => l.name === trimmed)) return;
    const newLabel = await createPackLabel(pack.id, trimmed);
    if (newLabel) {
      const updated = [...labels, newLabel];
      setLabels(updated);
      onLabelsChanged?.(updated);
    }
    setLabelInput("");
  }, [labelInput, labels, pack.id, onLabelsChanged]);

  const handleRemoveLabel = useCallback(
    async (labelId: number) => {
      await deletePackLabel(labelId);
      const updated = labels.filter((l) => l.id !== labelId);
      setLabels(updated);
      onLabelsChanged?.(updated);
    },
    [labels, onLabelsChanged],
  );

  const publisher = pack.build ? (
    <Link
      to={`/${pack.projectPath}/~builds/${pack.build.id}`}
      className="text-break"
    >
      Build #{pack.build.buildNumber ?? pack.build.id}
    </Link>
  ) : pack.user ? (
    <Link to={`/~users/${pack.user.name}`} className="text-break">
      {pack.user.displayName} (@{pack.user.name})
    </Link>
  ) : (
    <span className="text-muted">—</span>
  );

  return (
    <div className="pack-side">
      {/* Properties section */}
      <div className="properties">
        <div>
          <div className="name">Published By</div>
          <div className="value">{publisher}</div>
        </div>
        <div>
          <div className="name">Published At</div>
          <div className="value">
            <span>{formatAge(pack.publishDate)}</span>
          </div>
        </div>
        <div>
          <div className="name">Total Size</div>
          <div className="value">
            <span>{formatBytes(pack.size)}</span>
          </div>
        </div>
      </div>

      {/* Labels section */}
      <div className="labels">
        <div className="head d-flex align-items-center justify-content-between mb-3">
          <span className="font-weight-bolder">Labels</span>
        </div>
        <div className="body d-flex flex-wrap align-items-center mb-2">
          {labels.map((l) => (
            <span
              key={l.id}
              className="badge badge-light mr-1 mb-1 d-inline-flex align-items-center"
            >
              <span
                className="mr-1"
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: l.color ?? "#6c757d",
                }}
              />
              {l.name}
              {canWrite && (
                <a
                  href="#"
                  className="ml-1 text-muted"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveLabel(l.id);
                  }}
                >
                  &times;
                </a>
              )}
            </span>
          ))}
          {labels.length === 0 && (
            <span className="text-muted font-size-sm">No labels</span>
          )}
        </div>
        {canWrite && (
          <>
            <div className="input-group input-group-sm mb-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Add label…"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
              />
            </div>
            <span className="form-text font-size-sm text-muted">
              Labels can be defined in Administration / Label Management
            </span>
          </>
        )}
      </div>

      {/* Delete action */}
      {canWrite && (
        <div className="actions">
          <button
            className="delete btn btn-light-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}
