import { useEffect } from "react";

const SIMPLE_PAGE_CLASSES = ["SimplePage"] as const;

/**
 * Mirrors OneDev BasePage: page-specific CSS hooks on <html> (e.g. SimplePage LoginPage).
 */
export function useSimplePage(pageClass: string): void {
  useEffect(() => {
    const html = document.documentElement;
    const added = [...SIMPLE_PAGE_CLASSES, pageClass];
    for (const cls of added) {
      html.classList.add(cls);
    }
    return () => {
      for (const cls of added) {
        html.classList.remove(cls);
      }
    };
  }, [pageClass]);
}
