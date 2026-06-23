import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "buildx-dark-mode";

export function useDarkMode(): { dark: boolean; setDark: (enabled: boolean) => void; toggleDark: () => void } {
  const [dark, setDarkState] = useState(false);

  const setDark = useCallback((enabled: boolean) => {
    setDarkState(enabled);
    localStorage.setItem(STORAGE_KEY, String(enabled));
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  useEffect(() => {
    const enabled = localStorage.getItem(STORAGE_KEY) === "true";
    setDarkState(enabled);
    document.documentElement.classList.toggle("dark-mode", enabled);
  }, []);

  const toggleDark = useCallback(() => {
    setDark(!dark);
  }, [dark, setDark]);

  return { dark, setDark, toggleDark };
}
