import { useEffect, useMemo, useState } from "react";
import { CodeEditor } from "../onedev/CodeEditor";
import { Icon } from "../onedev/Icon";
import { BUILD_SPEC_PATH } from "../../buildspec/path";
import { buildSpecPosition, parseBuildSpecSelection } from "../../buildspec/position";
import { parseBuildSpecYaml } from "../../buildspec/yaml";
import { validateBuildSpecYaml } from "../../api/buildspec";
import {
  BuildSpecViewPanel,
  BuildSpecUnparseableViewPanel,
} from "./BuildSpecViewPanel";
import type { RunJobContext } from "../onedev/job/RunJobLink";
import "./build-spec.css";

type BuildSpecBlobViewPanelProps = {
  filePath: string;
  content: string;
  position: string | null;
  onPositionChange: (position: string | null) => void;
  runJobContext?: RunJobContext | null;
};

export function BuildSpecBlobViewPanel({
  filePath,
  content,
  position,
  onPositionChange,
  runJobContext,
}: BuildSpecBlobViewPanelProps) {
  const [viewPlain, setViewPlain] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const parseResult = useMemo(() => parseBuildSpecYaml(content), [content]);
  const selection = parseBuildSpecSelection(position);
  const yamlPath = filePath.endsWith(".yml") || filePath.endsWith(".yaml") ? filePath : BUILD_SPEC_PATH;

  useEffect(() => {
    if ("error" in parseResult) {
      setValidationErrors([]);
      return;
    }
    let cancelled = false;
    void validateBuildSpecYaml(content).then((result) => {
      if (!cancelled) {
        setValidationErrors(result.errors ?? []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [content, parseResult]);

  const handleSelectionChange = (nextSelection: string | null) => {
    onPositionChange(buildSpecPosition(nextSelection));
  };

  if (viewPlain) {
    return (
      <div className="build-spec-plain-view d-flex flex-column flex-grow-1">
        <div className="head d-flex align-items-center px-3 py-2 border-bottom flex-shrink-0">
          <label className="checkbox mb-0 mr-3">
            <input
              type="checkbox"
              checked={viewPlain}
              onChange={(e) => setViewPlain(e.target.checked)}
            />{" "}
            YAML
          </label>
        </div>
        <div className="body flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
          <CodeEditor value={content} filePath={yamlPath} readOnly />
        </div>
      </div>
    );
  }

  return (
    <div className="build-spec-blob-view d-flex flex-column flex-grow-1">
      <div className="head d-flex align-items-center px-3 py-2 border-bottom flex-shrink-0">
        <label className="checkbox mb-0">
          <input
            type="checkbox"
            checked={viewPlain}
            onChange={(e) => setViewPlain(e.target.checked)}
          />{" "}
          <Icon name="yaml" className="icon mr-1" /> YAML
        </label>
      </div>
      <div className="body flex-grow-1 d-flex flex-column overflow-auto">
        {"error" in parseResult ? (
          <BuildSpecUnparseableViewPanel error={parseResult.error} />
        ) : (
          <BuildSpecViewPanel
            spec={parseResult.spec}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            validationErrors={validationErrors}
            runJobContext={runJobContext}
          />
        )}
      </div>
    </div>
  );
}
