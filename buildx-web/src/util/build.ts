/** Format git ref name for display (refs/heads/main → main). */
export function formatRefName(refName: string): string {
  if (refName.startsWith("refs/heads/")) {
    return refName.slice("refs/heads/".length);
  }
  if (refName.startsWith("refs/tags/")) {
    return refName.slice("refs/tags/".length);
  }
  return refName;
}

/** Format duration in milliseconds as human-readable string. */
export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return "-";
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    if (ms < 1000) {
      return ms > 0 ? "<1s" : "0s";
    }
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) {
    return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

/** Format ISO date for list display. */
export function formatBuildDate(iso: string | undefined): string {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}
