import { useEffect, useState } from "react";
import { fetchSecuritySetting } from "../api/settings";

type SecuritySettingState = {
  enableAnonymousAccess: boolean;
  loading: boolean;
};

/**
 * OneDev SecuritySetting.isEnableAnonymousAccess() — defaults false until API is live.
 */
export function useSecuritySetting(): SecuritySettingState {
  const [enableAnonymousAccess, setEnableAnonymousAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const setting = await fetchSecuritySetting();
        if (!cancelled) {
          setEnableAnonymousAccess(setting.enableAnonymousAccess);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { enableAnonymousAccess, loading };
}
