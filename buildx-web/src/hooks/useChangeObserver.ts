import { useEffect } from "react";

/** OneDev ChangeObserver WebSocket skeleton — no-op until server push is ready. */
export function useChangeObserver(_channels: string[], onChange?: () => void) {
  useEffect(() => {
    if (!onChange) {
      return;
    }
    // Stub: poll-less no-op. Replace with WebSocket when buildx-server supports it.
    return undefined;
  }, [onChange]);
}
