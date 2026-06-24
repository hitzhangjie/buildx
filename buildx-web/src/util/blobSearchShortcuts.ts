/**
 * Blob page search shortcuts — mirrors OneDev project-blob.js + base.js canInput.
 *
 * OneDev ref:
 * - references/onedev/.../web/page/project/blob/project-blob.js
 * - references/onedev/.../web/page/base/base.js (canInput)
 */

/** Matches onedev.server.util.canInput — readonly CodeMirror textarea does not block. */
export function canInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
    return false;
  }
  return !target.classList.contains("readonly");
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
}

/** DOM checks at event time, same as OneDev project-blob.js. */
export function canTriggerBlobSearchShortcut(target: EventTarget | null): boolean {
  if (document.querySelector(".blob-content > .blob-edit")) {
    return false;
  }
  for (const modal of document.querySelectorAll(".modal")) {
    if (isVisible(modal)) {
      return false;
    }
  }
  return !canInput(target);
}

export type BlobSearchShortcutHandlers = {
  onQuickSearch: () => void;
  onAdvancedSearch: () => void;
};

/**
 * Bind t/T and v/V shortcuts on the blob files page.
 * Uses capture phase so shortcuts work while CodeMirror (readonly source view) is focused.
 */
export function bindBlobSearchShortcuts(handlers: BlobSearchShortcutHandlers): () => void {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.isComposing) {
      return;
    }
    if (!canTriggerBlobSearchShortcut(e.target)) {
      return;
    }
    if (e.keyCode === 84) {
      e.preventDefault();
      handlers.onQuickSearch();
    } else if (e.keyCode === 86) {
      e.preventDefault();
      handlers.onAdvancedSearch();
    }
  }

  document.addEventListener("keydown", handleKeyDown, true);
  return () => document.removeEventListener("keydown", handleKeyDown, true);
}
