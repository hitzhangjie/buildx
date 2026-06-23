export function showLoadingIndicator(): void {
  const el = document.getElementById("ajax-loading-indicator");
  if (el) {
    el.classList.remove("d-none");
  }
}

export function hideLoadingIndicator(): void {
  const el = document.getElementById("ajax-loading-indicator");
  if (el) {
    el.classList.add("d-none");
  }
}
