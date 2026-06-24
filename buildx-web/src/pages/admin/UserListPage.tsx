import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchUsers, type User } from "../../api/users";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";
import "./user-list-page.css";

/**
 * Mirrors OneDev UserListPage.html.
 * Reference: references/onedev/.../web/page/admin/user/UserListPage.html
 */
export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const query = useMemo(() => searchParams.get("query") ?? "", [searchParams]);
  const includeDisabled = useMemo(
    () => searchParams.get("includeDisabled") === "true",
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErrors([]);
      try {
        const list = await fetchUsers(query);
        if (!cancelled) {
          setUsers(list);
        }
      } catch (err) {
        if (!cancelled) {
          setErrors([(err as { message?: string }).message ?? "Failed to load users"]);
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const countText = users.length === 1 ? "found 1 user" : `found ${users.length} users`;
  const allSelected = users.length > 0 && selectedIds.length === users.length;

  function handleQueryChange(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const normalized = value.trim();
      if (normalized) {
        next.set("query", normalized);
      } else {
        next.delete("query");
      }
      return next;
    }, { replace: true });
  }

  function handleIncludeDisabledChange(checked: boolean) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (checked) {
        next.set("includeDisabled", "true");
      } else {
        next.delete("includeDisabled");
      }
      return next;
    }, { replace: true });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(users.map((it) => it.id));
    } else {
      setSelectedIds([]);
    }
  }

  function toggleSelectOne(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((it) => it !== id);
    });
  }

  return (
    <Layout title="Users" topbarTitle="Users">
      <div className="m-2 m-sm-5">
        <div className="card user-list">
          <div className="card-body">
            <div className="d-flex align-items-center mb-4">
              <div className="clearable-wrapper flex-grow-1 mr-3">
                <input
                  className="form-control search"
                  placeholder="Filter by name or email address"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                />
              </div>
              <Link
                to="/~administration/users/new"
                className="btn btn-icon btn-primary flex-shrink-0"
                aria-label="Add new user"
              >
                <Icon name="plus" className="icon" width={16} height={16} />
              </Link>
            </div>

            <div className="mb-4 user-list-toolbar">
              <span className="text-gray mr-3 mb-2 d-inline-block text-nowrap">
                <Icon name="ellipsis-circle" className="icon rotate-180 mr-1" width={14} height={14} />
                Operations
              </span>
              <label className="text-gray mb-2 d-inline-flex align-items-center text-nowrap include-disabled">
                <input
                  type="checkbox"
                  checked={includeDisabled}
                  onChange={(e) => handleIncludeDisabledChange(e.target.checked)}
                />
                Include Disabled
              </label>
              {!loading && users.length > 0 && <span className="float-right text-gray">{countText}</span>}
            </div>

            <FormFeedbackPanel messages={errors} />

            <table className="users table table-hover">
              <thead>
                <tr>
                  <th className="selection-col">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all users"
                    />
                  </th>
                  <th>Login Name</th>
                  <th>Full Name</th>
                  <th>Primary Email</th>
                  <th>Auth Source</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      Loading users...
                    </td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      No users found
                    </td>
                  </tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="selection-col">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={(e) => toggleSelectOne(user.id, e.target.checked)}
                        aria-label={`Select ${user.name}`}
                      />
                    </td>
                    <td>
                      <span className="user-chip">
                        <span className="user-avatar" aria-hidden="true">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="name">{user.name}</span>
                      </span>
                    </td>
                    <td>{user.fullName}</td>
                    <td>{user.email || <i>Not specified</i>}</td>
                    <td>{user.disabled ? <i>N/A</i> : "Internal Database"}</td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <Link
                          to={`/~administration/users/${user.id}`}
                          className="btn btn-xs btn-icon btn-light btn-hover-primary"
                          title="Edit"
                        >
                          <Icon name="edit" className="icon" width={14} height={14} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-xs btn-icon btn-light btn-hover-primary"
                          title="Impersonate"
                        >
                          <Icon name="user-tick" className="icon" width={14} height={14} />
                        </button>
                      </div>
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
