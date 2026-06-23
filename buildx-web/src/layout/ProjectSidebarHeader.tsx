type ProjectSidebarHeaderProps = {
  label: string;
  avatarUrl?: string;
};

export function ProjectSidebarHeader({ label, avatarUrl }: ProjectSidebarHeaderProps) {
  return (
    <div className="menu-header">
      <img
        src={avatarUrl ?? "/~icon/project.svg"}
        alt=""
        className="menu-header-icon avatar"
        width={20}
        height={20}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/~icon/project.svg";
        }}
      />
      <span className="menu-header-text">{label}</span>
      <a
        href="#"
        className="mehu-header-ellipsis"
        title="More info"
        onClick={(e) => e.preventDefault()}
      >
        <img src="/~icon/ellipsis.svg" alt="" className="icon" width={16} height={16} />
      </a>
    </div>
  );
}
