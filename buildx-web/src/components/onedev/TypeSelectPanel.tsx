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
}: {
  typeDef: TypeDef;
  onSelect: (type: string) => void;
}) {
  const description = typeDef.description?.split(".")[0];

  return (
    <li className="type-node">
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
    </li>
  );
}

/**
 * Grouped, filterable type picker — mirrors OneDev TypeSelectPanel (NestedTree + filter input).
 */
export function TypeSelectPanel({ types, onSelect }: TypeSelectPanelProps) {
  const [filter, setFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  const { ungrouped, groups } = useMemo(() => {
    const ungroupedTypes: TypeDef[] = [];
    const groupMap = new Map<string, TypeDef[]>();
    for (const typeDef of types) {
      if (!typeDef.group) {
        ungroupedTypes.push(typeDef);
      } else {
        const list = groupMap.get(typeDef.group) ?? [];
        list.push(typeDef);
        groupMap.set(typeDef.group, list);
      }
    }
    return { ungrouped: ungroupedTypes, groups: groupMap };
  }, [types]);

  const filteredUngrouped = ungrouped.filter((t) => matchesFilter(t, filter));
  const filteredGroups = Array.from(groups.entries())
    .map(([name, items]) => ({ name, items: items.filter((t) => matchesFilter(t, filter)) }))
    .filter((g) => g.items.length > 0);

  const isFiltering = filter.trim().length > 0;

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
        <ul className="type-select-tree">
          {filteredUngrouped.map((typeDef) => (
            <TypeNode key={typeDef.type} typeDef={typeDef} onSelect={onSelect} />
          ))}
          {filteredGroups.map(({ name, items }) => (
            <li key={name} className="group-node">
              <a
                href="#"
                className="selectable"
                onClick={(e) => {
                  e.preventDefault();
                  toggleGroup(name);
                }}
              >
                <span>{name}</span>
              </a>
              {isGroupExpanded(name) ? (
                <ul>
                  {items.map((typeDef) => (
                    <TypeNode key={typeDef.type} typeDef={typeDef} onSelect={onSelect} />
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
