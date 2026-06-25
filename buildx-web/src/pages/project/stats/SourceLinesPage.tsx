import { useState, useEffect, useRef } from "react";
import * as echarts from "echarts";
import { fetchLineIncrements, type LineIncrements } from "../../../api/code-stats";
import "./code-stats.css";

/** Same useDarkMode as CodeContribsPage (could be extracted to shared hook). */
function useDarkMode(): boolean {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark-mode"),
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark-mode"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Format epoch day to "YY-M-D" (matches OneDev's formatDay). */
function formatDay(day: number): string {
  const ms = day * 86400 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear() % 100}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

/** Format Y-axis labels with optional kilo suffix. */
function formatYAxisLabel(value: number, useKilo: boolean): { useKilo: boolean; text: string } {
  if (useKilo && value >= 1000) {
    return { useKilo: true, text: (value / 1000).toFixed(1) + " k" };
  }
  return { useKilo: false, text: String(value) };
}

const COLORS = [
  "#53a8fd", "#19A519", "#EEAD08", "#09c112", "#ff4242",
  "#b00000", "#af29f8", "#ee6c1e", "#ef56cd", "#630596",
  "#8e4509", "#9b0f7b",
];

const NUM_TOP_LANGUAGES = 10;

interface SourceLinesPanelProps {
  projectId: number;
}

export function SourceLinesPanel({ projectId }: SourceLinesPanelProps) {
  const darkMode = useDarkMode();
  const chartRef = useRef<HTMLDivElement>(null);
  const [lineData, setLineData] = useState<LineIncrements>({});
  const [loading, setLoading] = useState(true);
  // hasDefaultBranch — in OneDev, shown when project has no default branch.
  const hasDefaultBranch = true;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLineIncrements(projectId);
        if (cancelled) return;
        setLineData(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!chartRef.current || loading || Object.keys(lineData).length === 0) return;

    const chart = echarts.init(chartRef.current);

    // Compute cumulative per-language line counts, sort by total.
    const languageTotals: Record<string, number> = {};
    const incrementDays: number[] = [];
    for (const dayStr of Object.keys(lineData)) {
      const day = Number(dayStr);
      delete (lineData[day] as any)["@class"]; // if present
      incrementDays.push(day);
      const incs = lineData[day];
      for (const lang of Object.keys(incs)) {
        languageTotals[lang] = (languageTotals[lang] || 0) + incs[lang];
      }
    }

    const languages = Object.keys(languageTotals).sort(
      (a, b) => languageTotals[b] - languageTotals[a],
    );
    const topLanguages = languages.slice(0, NUM_TOP_LANGUAGES);

    if (incrementDays.length === 0) return;

    incrementDays.sort((a, b) => a - b);
    const firstDay = incrementDays[0];
    const lastDay = incrementDays[incrementDays.length - 1];

    // Build daily cumulative series per language.
    const dailyByLang: Record<string, number[]> = {};
    for (const lang of topLanguages) {
      dailyByLang[lang] = [];
    }
    const xAxisData: string[] = [];

    for (let day = firstDay; day <= lastDay; day++) {
      xAxisData.push(formatDay(day));
      const incs = lineData[day] || {};
      for (const lang of topLanguages) {
        const arr = dailyByLang[lang];
        const prev = arr.length > 0 ? arr[arr.length - 1] : 0;
        arr.push(prev + (incs[lang] || 0));
      }
    }

    const series: echarts.EChartsOption["series"] = [];
    const legendData: { name: string }[] = [];
    let colorIdx = 0;

    for (const lang of topLanguages) {
      const data = dailyByLang[lang];
      // Check if this language has non-zero data in range
      const hasData = data.some((v) => v !== 0);
      if (!hasData) continue;

      series.push({
        name: lang,
        type: "line",
        color: COLORS[colorIdx % COLORS.length],
        symbol: "none",
        sampling: "average",
        smooth: true,
        animation: false,
        data,
      });
      legendData.push({ name: lang });
      colorIdx++;
    }

    let useKilo = false;
    chart.setOption({
      title: {
        text: hasDefaultBranch ? "SLOC on default branch" : "No default branch",
        left: "center",
        top: 10,
        textStyle: { color: darkMode ? "#cdcdde" : "#3F4254" },
      },
      grid: { left: "60px", right: "40px", top: "120px", bottom: "40px" },
      xAxis: {
        type: "category",
        data: xAxisData,
        boundaryGap: false,
        axisLabel: { color: darkMode ? "#cdcdde" : "#3F4254" },
      },
      yAxis: {
        minInterval: 1,
        min: 0,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: darkMode ? "#535370" : "#E4E6EF" } },
        boundaryGap: [0, 0],
        axisLabel: {
          formatter: (value: number) => {
            const r = formatYAxisLabel(value, useKilo);
            useKilo = r.useKilo;
            return r.text;
          },
          color: darkMode ? "#cdcdde" : "#3F4254",
        },
      },
      tooltip: {
        trigger: "axis",
        textStyle: { color: darkMode ? "white" : "#535370" },
        borderColor: darkMode ? "#36364F" : "white",
        backgroundColor: darkMode ? "#36364F" : "white",
      },
      legend: {
        top: 40,
        data: legendData,
        textStyle: { color: darkMode ? "#cdcdde" : "#3F4254" },
      },
      series,
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [lineData, darkMode, loading, hasDefaultBranch]);

  if (loading) {
    return (
      <div className="source-lines d-flex flex-column flex-grow-1 overflow-auto">
        <div className="text-center py-10 text-muted">Loading...</div>
      </div>
    );
  }

  if (Object.keys(lineData).length === 0) {
    return (
      <div className="source-lines d-flex flex-column flex-grow-1 overflow-auto">
        <div className="chart resize-aware flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="no-data">No data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="source-lines d-flex flex-column flex-grow-1 overflow-auto">
      <div className="chart resize-aware flex-grow-1" ref={chartRef} />
    </div>
  );
}
