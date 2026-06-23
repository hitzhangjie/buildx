/**
 * NoNameEditPanel — shown when creating a new file but no file name has been
 * entered yet. Matches OneDev's NoNameFormComponent.
 *
 * OneDev ref: web/page/project/blob/render/noname/NoNameFormComponent.html
 */
export function NoNameEditPanel() {
  return (
    <div className="no-name alert alert-notice alert-light-warning m-3">
      Please specify file name above before editing content
    </div>
  );
}
