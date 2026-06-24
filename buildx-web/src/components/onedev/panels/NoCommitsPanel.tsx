import { useNavigate } from "react-router-dom";
import { InlineDropdown } from "../DropdownMenu";
import "./NoCommitsPanel.css";

type NoCommitsPanelProps = {
  projectPath: string;
};

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
        <InlineDropdown label="adding files" className="link-primary dropdown-link">
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
        <InlineDropdown label="pushing an existing repository" className="link-primary dropdown-link">
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
