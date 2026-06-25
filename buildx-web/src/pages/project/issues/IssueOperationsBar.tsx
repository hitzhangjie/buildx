import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { stateColorMap, type GlobalIssueSetting } from "../../../api/issueSettings";
import type { Issue } from "../../../api/issues";
import { IssueStateTransitionModal } from "./IssueStateTransitionModal";

export interface IssueOperationsBarProps {
  issue: Issue;
  projectPath: string;
  issueSetting: GlobalIssueSetting;
  onIssueUpdate: () => void;
}

/**
 * Operations bar directly below the card header.
 * Contains state badge with dropdown (→ transition modal), workspace link, new issue button.
 * Mirrors OneDev IssueOperationsPanel + TransitionMenuLink + IssueStateBadge.
 *
 * Reference: references/onedev/.../web/component/issue/operation/IssueOperationsPanel.html
 * Reference: references/onedev/.../web/component/issue/operation/TransitionMenuLink.java
 * Reference: references/onedev/.../web/component/issue/IssueStateBadge.java
 */
export function IssueOperationsBar({
  issue,
  projectPath,
  issueSetting,
  onIssueUpdate,
}: IssueOperationsBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLAnchorElement>(null);

  const colorMap = stateColorMap(issueSetting);
  const stateColor = colorMap.get(issue.state) ?? "#6c757d";

  // Available target states: all states except the current one.
  // In OneDev, these are further filtered by transition specs (ManualSpec.canTransit).
  const targetStates = issueSetting.stateSpecs.filter(
    (s) => s.name !== issue.state,
  );

  // Close dropdown on click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node) &&
      toggleRef.current &&
      !toggleRef.current.contains(e.target as Node)
    ) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, handleClickOutside]);

  // Close dropdown on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("keydown", handler);
    }
    return () => document.removeEventListener("keydown", handler);
  }, [dropdownOpen]);

  const handleStateClick = () => {
    if (targetStates.length > 0) {
      setDropdownOpen((prev) => !prev);
    }
  };

  const handleTransitionSelect = (stateName: string) => {
    setDropdownOpen(false);
    setTransitionTarget(stateName);
  };

  const getStateColor = (name: string): string => {
    return issueSetting.stateSpecs.find((s) => s.name === name)?.color ?? "#6c757d";
  };

  return (
    <>
      <div className="issue-operations d-flex flex-wrap row-gap-3 mb-5">
        <div className="state mr-3">
          <a
            ref={toggleRef}
            className={targetStates.length === 0 ? "disabled" : ""}
            role="button"
            tabIndex={0}
            onClick={handleStateClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleStateClick();
              }
            }}
          >
            <span
              className="issue-state badge"
              style={{
                backgroundColor: stateColor,
                color: "#fff",
                cursor: targetStates.length > 0 ? "pointer" : "default",
              }}
            >
              {issue.state}
              {targetStates.length > 0 && (
                <svg className="icon icon-sm ml-1" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              )}
            </span>
          </a>

          {/* Dropdown menu — mirrors OneDev MenuPanel rendering of transition items */}
          {dropdownOpen && targetStates.length > 0 && (
            <div
              ref={dropdownRef}
              className="state-transition-dropdown"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                zIndex: 1051,
                minWidth: 220,
                padding: "0.5rem 0",
                backgroundColor: "#fff",
                border: "1px solid #dee2e6",
                borderRadius: "0.25rem",
                boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
              }}
            >
              {targetStates.map((s) => {
                const color = getStateColor(s.name);
                return (
                  <button
                    key={s.name}
                    type="button"
                    className="dropdown-item d-flex align-items-center"
                    style={{
                      border: "none",
                      background: "none",
                      width: "100%",
                      textAlign: "left",
                      padding: "0.5rem 1rem",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                    onClick={() => handleTransitionSelect(s.name)}
                  >
                    <span
                      className="badge mr-3 flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        color: "#fff",
                        padding: "0.35rem 0.6rem",
                        fontSize: "0.8rem",
                      }}
                    >
                      {s.name}
                    </span>
                    <span className="text-truncate">
                      Transition to <strong>{s.name}</strong>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <a
          className="workspace mr-3 btn btn-outline-secondary btn-sm flex-shrink-0"
          title="Workspaces on this issue"
          href={`/${projectPath}/~issues/${issue.number}/workspaces`}
        >
          Workspaces <Icon name="arrow" className="icon rotate-90" />
        </a>
        <Link
          to={`/${projectPath}/~issues/new`}
          className="new-issue btn btn-primary btn-sm btn-icon ml-auto"
          title="Create new issue"
        >
          <Icon name="plus" className="icon" />
        </Link>
      </div>

      {transitionTarget && (
        <IssueStateTransitionModal
          issueId={issue.id}
          currentState={issue.state}
          targetState={transitionTarget}
          issueSetting={issueSetting}
          onClose={() => setTransitionTarget(null)}
          onTransited={onIssueUpdate}
        />
      )}
    </>
  );
}
