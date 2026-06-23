import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./NoCommitsPanel.css";

type NoCommitsPanelProps = {
  projectPath: string;
};

/**
 * Dropdown menu rendered as a floating panel, matching OneDev's FloatingPanel/DropdownLink behavior.
 * Anchors to the trigger element and closes on outside click.
 */
function DropdownMenu({
  isOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="floating dropdown-menu show" style={{ position: "absolute", zIndex: 1050 }}>
      <div className="dropdown-menu-content">{children}</div>
    </div>
  );
}

/**
 * Inline dropdown trigger + floating menu, matching OneDev's DropdownLink component.
 */
function InlineDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  return (
    <span className="dropdown-aware d-inline-block position-relative">
      <a
        ref={triggerRef}
        className={`link-primary dropdown-link${open ? " dropdown-open" : ""}`}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        role="button"
      >
        {label}
      </a>
      <DropdownMenu isOpen={open} onClose={() => setOpen(false)} triggerRef={triggerRef}>
        {children}
      </DropdownMenu>
    </span>
  );
}

/**
 * NoCommitsPanel — shown when a project has no commits yet.
 * Provides CTAs to add files, set up CI/CD, or push an existing repository.
 * Matches OneDev's NoCommitsPanel in DOM structure, CSS classes, and behavior.
 */
export function NoCommitsPanel({ projectPath }: NoCommitsPanelProps) {
  const navigate = useNavigate();
  const cloneUrl = `${window.location.origin}/${projectPath}.git`;

  const handleCreateNewFile = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/${projectPath}/~files/main?mode=add`);
  };

  const handleUploadFiles = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/${projectPath}/~files/main?mode=upload`);
  };

  const handleSetupCICD = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/${projectPath}/~files/main?mode=add&initialPath=.onedev-buildspec.yml`);
  };

  return (
    <div className="m-4 no-commits text-center flex-grow-1 d-flex flex-column justify-content-center align-items-center">
      <img src="/~icon/empty.svg" className="text-center mb-5" alt="" />
      <h3 className="alert-heading mb-3">Project does not have any code yet</h3>
      <div className="mb-4">
        You may initialize the project by{" "}
        <InlineDropdown label="adding files">
          <div className="list-group list-group-flush">
            <a
              className="list-group-item list-group-item-action"
              href={`/${projectPath}/~files/main?mode=add`}
              onClick={handleCreateNewFile}
            >
              Create New File
            </a>
            <a
              className="list-group-item list-group-item-action"
              href={`/${projectPath}/~files/main?mode=upload`}
              onClick={handleUploadFiles}
            >
              Upload Files
            </a>
          </div>
        </InlineDropdown>
        {", "}
        <a
          href={`/${projectPath}/~files/main?mode=add&initialPath=.onedev-buildspec.yml`}
          className="link-primary"
          onClick={handleSetupCICD}
        >
          setting up CI/CD
        </a>
        {", or "}
        <InlineDropdown label="pushing an existing repository">
          <div className="p-3" style={{ maxWidth: 480 }}>
            <div className="font-weight-bolder mb-3">
              Run below commands from within your git repository:
            </div>
            <div className="code">
              <div>git remote add origin {cloneUrl}</div>
              <div>git push -u origin main</div>
            </div>
          </div>
        </InlineDropdown>
      </div>
    </div>
  );
}
