import { Link } from "react-router-dom";

type ProjectTopbarTitleProps = {
  projectPath: string;
  pageTitle: string;
};

export function ProjectTopbarTitle({ projectPath, pageTitle }: ProjectTopbarTitleProps) {
  const segments = projectPath.split("/").filter(Boolean);

  return (
    <>
      <Link to="/~projects" className="d-none d-sm-inline">
        Projects
      </Link>
      <span className="project-path d-inline-flex align-items-center text-truncate">
        {segments.map((segment, index) => {
          const path = segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          return (
            <span key={path} className="d-inline-flex align-items-center">
              <span className="dot flex-shrink-0">·</span>
              {isLast ? (
                <Link to={`/${path}`} className="text-truncate">
                  {segment}
                </Link>
              ) : (
                <Link to={`/${path}`} className="text-truncate">
                  {segment}
                </Link>
              )}
            </span>
          );
        })}
      </span>
      {pageTitle && (
        <>
          <span className="dot flex-shrink-0">·</span>
          <span className="text-truncate">{pageTitle}</span>
        </>
      )}
    </>
  );
}
