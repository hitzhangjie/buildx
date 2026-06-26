import { useCallback, useMemo, useState } from "react";
import { CodeEditor } from "../onedev/CodeEditor";
import { Icon } from "../onedev/Icon";
import { BUILD_SPEC_PATH } from "../../buildspec/path";
import { buildSpecPosition, parseBuildSpecSelection } from "../../buildspec/position";
import { parseBuildSpecYaml, serializeBuildSpecYaml } from "../../buildspec/yaml";
import type { BuildSpec } from "../../buildspec/types";
import { validateBuildSpecYaml } from "../../api/buildspec";
import { BuildSpecEditPanel, BuildSpecUnparseablePanel } from "./BuildSpecEditPanel";
import { CommitOptionPanel } from "../../pages/project/blob/CommitOptionPanel";
import "../../pages/project/blob/BlobAddEditPanel.css";
import "./build-spec.css";

type TabName = "edit" | "edit-plain" | "changes" | "save";

type BuildSpecBlobEditPanelProps = {
  filePath: string;
  initialContent: string;
  revision: string;
  projectPath?: string;
  mode?: "add" | "edit";
  position: string | null;
  onPositionChange: (position: string | null) => void;
  onCancel: () => void;
  onCommit: (commitMessage: string, content: string) => void;
};

function computeDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent ? oldContent.split("\n") : [];
  const newLines = newContent ? newContent.split("\n") : [];
  const result: string[] = [];
  const lcs = longestCommonSubsequence(oldLines, newLines);
  let oi = 0;
  let ni = 0;
  let li = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length) {
      while (oi < oldLines.length && oldLines[oi] !== lcs[li]) {
        result.push(`- ${oldLines[oi]}`);
        oi++;
      }
      while (ni < newLines.length && newLines[ni] !== lcs[li]) {
        result.push(`+ ${newLines[ni]}`);
        ni++;
      }
      result.push(`  ${lcs[li]}`);
      oi++;
      ni++;
      li++;
    } else {
      while (oi < oldLines.length) {
        result.push(`- ${oldLines[oi]}`);
        oi++;
      }
      while (ni < newLines.length) {
        result.push(`+ ${newLines[ni]}`);
        ni++;
      }
    }
  }
  return result.join("\n");
}

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const result: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

export function BuildSpecBlobEditPanel({
  filePath,
  initialContent,
  revision,
  projectPath,
  mode = "add",
  position,
  onPositionChange,
  onCancel,
  onCommit,
}: BuildSpecBlobEditPanelProps) {
  const initialParse = useMemo(() => parseBuildSpecYaml(initialContent), [initialContent]);
  const [activeTab, setActiveTab] = useState<TabName>("edit");
  const [lastEditedMode, setLastEditedMode] = useState<"visual" | "yaml">("visual");
  const [yamlContent, setYamlContent] = useState(initialContent);
  const [spec, setSpec] = useState<BuildSpec | null>(
    "spec" in initialParse ? initialParse.spec : null,
  );
  const [parseError, setParseError] = useState<string | null>(
    "error" in initialParse ? initialParse.error : null,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const selection = parseBuildSpecSelection(position);
  const fileName = filePath.split("/").pop() || BUILD_SPEC_PATH;
  const yamlPath = filePath.endsWith(".yml") || filePath.endsWith(".yaml") ? filePath : BUILD_SPEC_PATH;

  const serializedFromVisual = useMemo(() => (spec ? serializeBuildSpecYaml(spec) : yamlContent), [spec, yamlContent]);

  const editingContent = activeTab === "edit-plain" || parseError ? yamlContent : serializedFromVisual;

  const changesDiff = useMemo(() => {
    if (activeTab !== "changes") {
      return null;
    }
    return computeDiff(initialContent, editingContent);
  }, [activeTab, initialContent, editingContent]);

  const syncVisualToYaml = useCallback(() => {
    if (spec) {
      setYamlContent(serializeBuildSpecYaml(spec));
    }
  }, [spec]);

  const syncYamlToVisual = useCallback(() => {
    const result = parseBuildSpecYaml(yamlContent);
    if ("error" in result) {
      setParseError(result.error);
      setSpec(null);
    } else {
      setParseError(null);
      setSpec(result.spec);
    }
  }, [yamlContent]);

  const handleTabChange = (tab: TabName) => {
    if (tab === "edit-plain" && activeTab === "edit") {
      syncVisualToYaml();
      setLastEditedMode("yaml");
    } else if (tab === "edit" && activeTab === "edit-plain") {
      syncYamlToVisual();
      setLastEditedMode("visual");
    } else if (tab === "edit") {
      setLastEditedMode("visual");
    } else if (tab === "edit-plain") {
      setLastEditedMode("yaml");
    }
    setActiveTab(tab);
  };

  const handleCommit = async (commitMessage: string) => {
    let content = yamlContent;
    if (lastEditedMode === "visual" && spec && !parseError) {
      content = serializeBuildSpecYaml(spec);
    } else if (lastEditedMode === "yaml") {
      const result = parseBuildSpecYaml(yamlContent);
      if ("error" in result) {
        setParseError(result.error);
        setActiveTab("edit-plain");
        return;
      }
      content = yamlContent;
    }

    const validation = await validateBuildSpecYaml(content);
    if (!validation.valid && validation.errors?.length) {
      setValidationError(validation.errors.join("\n"));
      setActiveTab("save");
      return;
    }
    setValidationError(null);
    onCommit(commitMessage, content);
  };

  const handleSelectionChange = (nextSelection: string | null) => {
    onPositionChange(buildSpecPosition(nextSelection));
  };

  return (
    <div className="blob-edit d-flex flex-column flex-grow-1">
      <div className="head d-flex align-items-stretch px-3 flex-shrink-0 border-bottom">
        <div className={`tab edit mr-4 d-flex align-items-stretch${activeTab === "edit" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange("edit");
            }}
          >
            <img src="/~icon/edit.svg" className="icon mr-1" width={16} height={16} alt="" />
            Edit
          </a>
        </div>
        <div className={`tab edit-plain mr-4 d-flex align-items-stretch${activeTab === "edit-plain" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleTabChange("edit-plain");
            }}
          >
            <Icon name="yaml" className="icon mr-1" />
            YAML
          </a>
        </div>
        <div className={`tab changes mr-4 d-flex align-items-stretch${activeTab === "changes" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (activeTab === "edit") {
                syncVisualToYaml();
              }
              setActiveTab("changes");
            }}
          >
            <img src="/~icon/diff2.svg" className="icon mr-1" width={16} height={16} alt="" />
            Changes
          </a>
        </div>
        <div className={`save tab mr-4 d-flex align-items-stretch${activeTab === "save" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (activeTab === "edit") {
                syncVisualToYaml();
              } else if (activeTab === "edit-plain") {
                syncYamlToVisual();
              }
              setActiveTab("save");
            }}
          >
            <img src="/~icon/save.svg" className="icon mr-1" width={16} height={16} alt="" />
            Save
          </a>
        </div>
        <div className="cancel mr-4 d-flex align-items-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onCancel();
            }}
          >
            Cancel
          </a>
        </div>
      </div>

      <div className="body flex-grow-1 d-flex flex-column">
        <div
          className={activeTab === "edit" ? "d-flex flex-grow-1 flex-column overflow-auto" : "d-none"}
          style={{ minHeight: 0 }}
        >
          {parseError && activeTab === "edit" ? (
            <BuildSpecUnparseablePanel error={parseError} />
          ) : spec ? (
            <BuildSpecEditPanel
              spec={spec}
              selection={selection}
              projectPath={projectPath}
              revision={revision}
              onSpecChange={(next) => {
                setLastEditedMode("visual");
                setSpec(next);
              }}
              onSelectionChange={handleSelectionChange}
            />
          ) : null}
        </div>

        <div
          className={activeTab === "edit-plain" ? "d-flex flex-grow-1 flex-column" : "d-none"}
          style={{ minHeight: 0 }}
        >
          <CodeEditor
            value={yamlContent}
            onChange={(value) => {
              setLastEditedMode("yaml");
              setYamlContent(value);
            }}
            filePath={yamlPath}
          />
        </div>

        <div
          className={
            activeTab === "changes"
              ? "changes-viewer flex-grow-1 flex-column autofit p-4 overflow-auto d-flex"
              : "d-none"
          }
        >
          {changesDiff ? (
            <pre className="diff-view font-size-sm mb-0">{changesDiff}</pre>
          ) : (
            <div className="text-muted">No changes</div>
          )}
        </div>

        <div className={activeTab === "save" ? "commit-options flex-grow-1 d-flex flex-column autofit" : "d-none"}>
          {validationError ? (
            <div className="alert alert-light-danger mx-3 mt-3 mb-0">
              <pre className="mb-0 font-size-sm">{validationError}</pre>
            </div>
          ) : null}
          <CommitOptionPanel
            fileName={fileName}
            action={mode}
            onCommit={(msg) => void handleCommit(msg)}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}
