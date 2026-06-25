import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchPacks, type Pack } from "../../../api/packs";
import { EmptyListState } from "../../../components/global-list/EmptyListState";
import {
  DEFAULT_QUERY_LINKS,
  ResourceListPanel,
} from "../../../components/global-list/ResourceListPanel";
import { buildProjectScopedHref } from "../../../data/queryPresets";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { PackFilterPanel } from "../../../components/onedev/panels/PackFilterPanel";
import { useProject } from "../../../context/ProjectContext";
import { QueryListLayout } from "../../../components/onedev/panels/QueryListLayout";
import { Layout } from "../../../layout/Layout";

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

function PackRow({ pack, projectPath }: { pack: Pack; projectPath: string }) {
  return (
    <tr>
      <td className="pack">
        <Link
          to={`/${projectPath}/~packages/${pack.id}`}
          className="text-nowrap mr-2"
        >
          <img
            src="/~icon/package.svg"
            alt=""
            className="icon mr-1"
            width={16}
            height={16}
          />
          <span>{pack.reference}</span>
        </Link>
        <span>
          {pack.labels.map((l) => (
            <span key={l.id} className="badge badge-light mr-1">
              {l.name}
            </span>
          ))}
        </span>
      </td>
      <td className="type d-none d-lg-table-cell">{pack.type}</td>
      <td className="date d-none d-lg-table-cell text-muted">
        {formatAge(pack.publishDate)}
      </td>
      <td className="size d-none d-lg-table-cell text-muted">
        {formatBytes(pack.size)}
      </td>
    </tr>
  );
}

/**
 * ProjectPacksPage — project-scoped package list.
 *
 * Reference: references/onedev/.../web/page/project/packs/ProjectPacksPage.html
 */
export function ProjectPacksPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const {
    data: allPacks,
    loading,
    error,
  } = useAsyncResource(fetchPacks, []);

  // Filter packs to this project
  const packs = (allPacks ?? []).filter(
    (p) => p.projectPath === projectPath,
  );

  // Client-side query filtering
  const filteredPacks = query
    ? packs.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q)
        );
      })
    : packs;

  const toolbarLinks = [
    {
      icon: "filter",
      label: "Filter",
      onClick: () => setShowFilter((v) => !v),
    },
    ...DEFAULT_QUERY_LINKS.slice(1), // skip default "Filter" link
  ];

  return (
    <Layout title={`Packages - ${projectPath}`}>
      <QueryListLayout
        className="side-main side-main-wrap"
        storageKey={`packages:project:${projectPath}`}
        currentQuery={query}
        onSelectQuery={setQuery}
        buildHref={(q) =>
          buildProjectScopedHref(`/${projectPath}/~packages`, q)
        }
      >
        {({ toolbarActions }) => (
          <div className="p-2 p-sm-5">
            <ResourceListPanel
              cardClass="pack-list"
              queryPlaceholder="Query/order packages"
              toolbarLinks={toolbarLinks}
              savedQueryToolbar={toolbarActions}
              query={query}
              onQuery={setQuery}
              count={filteredPacks.length}
              loading={loading}
              error={error}
            >
              {showFilter && (
                <PackFilterPanel
                  currentQuery={query}
                  onQueryChange={setQuery}
                />
              )}
              {!filteredPacks.length ? (
                <EmptyListState message="No packages yet" />
              ) : (
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th className="pack">Package</th>
                      <th className="type d-none d-lg-table-cell">Type</th>
                      <th className="date d-none d-lg-table-cell">
                        Last Published
                      </th>
                      <th className="size d-none d-lg-table-cell">
                        Total Size
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPacks.map((pack) => (
                      <PackRow
                        key={pack.id}
                        pack={pack}
                        projectPath={projectPath}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </ResourceListPanel>
          </div>
        )}
      </QueryListLayout>
    </Layout>
  );
}
