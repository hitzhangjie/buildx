import { useEffect, useState } from "react";

const svgCache = new Map<string, string>();

type IconProps = {
  name: string;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * Renders an SVG icon inline (not via <img>) so CSS can control
 * fill/stroke colors via the `color` property. Equivalent to
 * OneDev's SpriteImage which renders <svg><use href="..."/></svg>.
 */
export function Icon({ name, className = "icon", width = 20, height = 20 }: IconProps) {
  const [svgText, setSvgText] = useState<string | null>(
    () => svgCache.get(name) ?? null,
  );

  useEffect(() => {
    if (svgCache.has(name)) return;

    let cancelled = false;
    fetch(`/~icon/${name}.svg`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) {
          svgCache.set(name, text);
          setSvgText(text);
        }
      })
      .catch(() => {
        // keep fallback <img> on error
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  // Fallback: <img> tag while SVG loads (or on error).
  // Once cached the inline SVG renders immediately with no flash.
  if (!svgText) {
    return (
      <img
        src={`/~icon/${name}.svg`}
        alt=""
        className={className}
        width={width}
        height={height}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        width,
        height,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
}
