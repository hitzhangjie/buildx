import { useMemo, useState } from "react";
import type { TypeDef } from "../buildspec/registries";
import "./type-select.css";

type TypeSelectPanelProps = {
  types: readonly TypeDef[];
  onSelect: (type: string) => void;
};

function matchesFilter(typeDef: TypeDef, filter: string): boolean {
  const q = filter.replace(/\s/g, "").toLowerCase();
  if (!q) {
    return true;
  }
  const full = (typeDef.group ? `${typeDef.group}/${typeDef.label}` : typeDef.label)
    .replace(/\s/g, "")
    .toLowerCase();
  return full.includes(q);
}

function TypeNode({
  typeDef,
  onSelect,
  nested = false,
}: {
  typeDef: TypeDef;
  onSelect: (type: string) => void;
  nested?: boolean;
}) {
  const description = typeDef.description?.split(".")[0];
  const selectable = (
    <a
      href="#"
      className="selectable"
      onClick={(e) => {
        e.preventDefault();
        onSelect(typeDef.type);
      }}
    >
      <span>{typeDef.label}</span>
      {description ? (
        <div className="font-size-sm text-muted text-wrap">{description}</div>
      ) : null}
    </a>
  );

  return (
    <li className="type-node">
      {nested ? (
        selectable
      ) : (
        <div className="tree-node">
          <a className="tree-junction" aria-hidden="true" tabIndex={-1} />
          <span className="tree-content">{selectable}</span>
        </div>
      )}
    </li>
  );
}

/**
 * Grouped, filterable type picker — mirrors OneDev TypeSelectPanel (NestedTree + filter input).
 * Items are rendered in the order they appear in the `types` array, so groups are
 * interspersed with ungrouped items exactly as in OneDev's Add Step dropdown.
 */
export function TypeSelectPanel({ types, onSelect }: TypeSelectPanelProps) {
  const [filter, setFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  const isFiltering = filter.trim().length > 0;

  // Walk types in array order; emit ungrouped items inline and groups at their
  // first occurrence, collecting all items of the same group in order.
  const orderedItems = useMemo(() => {
    const seenGroups = new Set<string>();
    const result: Array<
      | { kind: "type"; typeDef: TypeDef }
      | { kind: "group"; name: string; items: TypeDef[] }
    > = [];
    for (const typeDef of types) {
      if (!typeDef.group) {
        result.push({ kind: "type", typeDef });
      } else if (!seenGroups.has(typeDef.group)) {
        seenGroups.add(typeDef.group);
        result.push({
          kind: "group",
          name: typeDef.group,
          items: types.filter((t) => t.group === typeDef.group),
        });
      }
    }
    return result;
  }, [types]);

  // Apply filter while preserving array order.
  const filteredItems = useMemo(() => {
    if (!isFiltering) return orderedItems;
    return orderedItems
      .map((item) => {
        if (item.kind === "type") {
          return matchesFilter(item.typeDef, filter) ? item : null;
        }
        const filtered = item.items.filter((t) => matchesFilter(t, filter));
        return filtered.length > 0 ? { ...item, items: filtered } : null;
      })
      .filter(Boolean) as typeof orderedItems;
  }, [orderedItems, filter, isFiltering]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const isGroupExpanded = (group: string) => isFiltering || expandedGroups.has(group);

  return (
    <div className="type-select">
      <input
        type="text"
        className="form-control"
        placeholder="Type to filter"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="content mt-3">
        <ul className="type-select-tree tree-theme-human">
          {filteredItems.map((item) => {
            if (item.kind === "type") {
              return (
                <TypeNode key={item.typeDef.type} typeDef={item.typeDef} onSelect={onSelect} />
              );
            }
            const expanded = isGroupExpanded(item.name);
            return (
              <li key={item.name} className="group-node">
                <div className="tree-node">
                  <a
                    href="#"
                    className={`tree-junction ${expanded ? "tree-junction-expanded" : "tree-junction-collapsed"}`}
                    aria-label={expanded ? "Collapse" : "Expand"}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleGroup(item.name);
                    }}
                  />
                  <span className="tree-content">
                    <a
                      href="#"
                      className="selectable"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleGroup(item.name);
                      }}
                    >
                      <span>{item.name}</span>
                    </a>
                  </span>
                </div>
                {expanded ? (
                  <ul>
                    {item.items.map((typeDef) => (
                      <TypeNode
                        key={typeDef.type}
                        typeDef={typeDef}
                        onSelect={onSelect}
                        nested
                      />
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
