import { useState, useCallback, type RefObject } from "react";
import { DropdownMenu } from "../DropdownMenu";

type CloneDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  projectPath: string;
};

/**
 * CloneDialog — dropdown panel showing git clone URL and command.
 * Anchored below the Clone trigger button in ProjectBlobPage.
 * Simplified from OneDev's GetCodePanel: no SSH toggle, no IDE links, no ZIP download.
 */
export function CloneDialog({ isOpen, onClose, triggerRef, projectPath }: CloneDialogProps) {
  const cloneUrl = `${window.location.origin}/${projectPath}.git`;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("clone-url-input") as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }, [cloneUrl]);

  return (
    <DropdownMenu isOpen={isOpen} onClose={onClose} triggerRef={triggerRef} align="right">
      <div className="clone-dialog p-3" style={{ width: 280 }}>
        <div className="font-weight-bolder mb-2 font-size-sm">Clone Repository</div>

        <div className="input-group input-group-sm mb-2">
          <input
            id="clone-url-input"
            type="text"
            className="form-control font-size-sm"
            value={cloneUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <div className="input-group-append">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>

        <div className="text-muted font-size-sm mb-1">Or run from command line:</div>
        <code className="d-block p-2 font-size-sm" style={{ background: "var(--light, #f8f9fa)", borderRadius: "0.25rem", wordBreak: "break-all" }}>
          git clone {cloneUrl}
        </code>
      </div>
    </DropdownMenu>
  );
}
