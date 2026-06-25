import { useState, useEffect, useRef, useCallback } from "react";
import * as echarts from "echarts";
import {
  fetchOverallContributions,
  fetchTopContributors,
  type OverallContributions,
  type TopContributor,
} from "../../../api/code-stats";
import "./code-stats.css";

/** Detect dark mode from document class (matches Layout.tsx behavior). */
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

// ---------------------------------------------------------------------------
// Helpers — match OneDev's code-stats.js formatting
// ---------------------------------------------------------------------------

/** Format epoch day to "YY-M-D" (matches OneDev's formatDay using JSJoda). */
function formatDay(day: number): string {
  // Epoch day = days since 1970-01-01 UTC
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CodeContribsPanelProps {
  projectId: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeContribsPanel({ projectId }: CodeContribsPanelProps) {
  const darkMode = useDarkMode();
  const overallRef = useRef<HTMLDivElement>(null);
  const overallChartRef = useRef<echarts.ECharts | null>(null);
  const [contribType, setContribType] = useState<string>("COMMITS");
  const [overallData, setOverallData] = useState<OverallContributions>({});
  const [loading, setLoading] = useState(true);
  const [fromDay, setFromDay] = useState(0);
  const [toDay, setToDay] = useState(0);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [topLoading, setTopLoading] = useState(false);
  const daysRef = useRef<number[]>([]);

  // Load overall contributions on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchOverallContributions(projectId);
      if (cancelled) return;
      setOverallData(data);
      setLoading(false);

      // Compute sorted day range.
      const days = Object.keys(data).map(Number).sort((a, b) => a - b);
      if (days.length > 0) {
        daysRef.current = [];
        for (let d = days[0]; d <= days[days.length - 1]; d++) {
          daysRef.current.push(d);
        }
        setFromDay(days[0]);
        setToDay(days[days.length - 1]);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // Initialize the overall chart.
  useEffect(() => {
    if (!overallRef.current || Object.keys(overallData).length === 0) return;

    const chart = echarts.init(overallRef.current);
    overallChartRef.current = chart;

    const days = daysRef.current;
    const xAxisData = days.map(formatDay);

    const getSeriesData = () => {
      const idx = contribType === "ADDITIONS" ? 1 : contribType === "DELETIONS" ? 2 : 0;
      return days.map((d) => {
        const c = overallData[d];
        if (!c) return 0;
        return [c.commits, c.additions, c.deletions][idx];
      });
    };

    const grid = { left: "80px", right: "40px", top: "40px", bottom: "40px" };
    let useKilo = false;

    const option: echarts.EChartsOption = {
      grid,
      xAxis: {
        type: "category",
        data: xAxisData,
        boundaryGap: false,
        axisLabel: { color: darkMode ? "#cdcdde" : "#3F4254" },
      },
      yAxis: {
        minInterval: 1,
        splitLine: { lineStyle: { color: darkMode ? "#535370" : "#E4E6EF" } },
        axisLine: { show: false },
        axisLabel: {
          formatter: (value: number) => {
            const r = formatYAxisLabel(value, useKilo);
            useKilo = r.useKilo;
            return r.text;
          },
          color: darkMode ? "#cdcdde" : "#3F4254",
        },
      },
      toolbox: { show: false },
      brush: {
        xAxisIndex: "all",
        brushLink: "all",
        outOfBrush: { colorAlpha: 0.1 },
        brushStyle: {
          color: darkMode ? "rgba(55,60,63,0.5)" : "rgba(225,240,255,0.5)",
          borderColor: "rgba(54,153,255,0.8)",
        },
      },
      series: [
        {
          type: "line",
          symbol: "none",
          smooth: true,
          color: "#1BC5BD",
          animation: false,
          data: getSeriesData(),
          areaStyle: { color: "#1BC5BD" },
        },
      ],
    };

    chart.setOption(option);
    chart.dispatchAction({
      type: "takeGlobalCursor",
      key: "brush",
      brushOption: { brushType: "lineX", brushMode: "single" },
    });

    chart.on("brush", (params: any) => {
      const areas = params?.areas;
      if (areas?.[0]) {
        const sel = areas[0].coordRange;
        const clamp = (i: number) => Math.max(0, Math.min(days.length - 1, i));
        setFromDay(days[clamp(sel[0])]);
        setToDay(days[clamp(sel[1])]);
      } else {
        setFromDay(days[0]);
        setToDay(days[days.length - 1]);
      }
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [overallData, darkMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload chart series when contribType changes.
  useEffect(() => {
    const chart = overallChartRef.current;
    if (!chart || Object.keys(overallData).length === 0) return;
    const days = daysRef.current;
    const idx = contribType === "ADDITIONS" ? 1 : contribType === "DELETIONS" ? 2 : 0;
    const data = days.map((d) => {
      const c = overallData[d];
      if (!c) return 0;
      return [c.commits, c.additions, c.deletions][idx];
    });
    chart.setOption({ series: [{ data }] });
  }, [contribType, overallData]);

  // Load top contributors when fromDay/toDay or type changes.
  const loadTopContributors = useCallback(async () => {
    if (!fromDay || !toDay) return;
    setTopLoading(true);
    try {
      const data = await fetchTopContributors(projectId, contribType, fromDay, toDay);
      setTopContributors(data);
    } finally {
      setTopLoading(false);
    }
  }, [projectId, contribType, fromDay, toDay]);

  useEffect(() => {
    loadTopContributors();
  }, [loadTopContributors]);

  const dateRangeText =
    fromDay && toDay ? `${formatDay(fromDay)} ~ ${formatDay(toDay)}` : "";

  return (
    <div className="code-contribs">
      <div className="alert alert-light">
        Contributions to default branch, excluding merge commits
      </div>

      <div className="d-flex align-items-center mb-3">
        <span className="date-range mr-3">{dateRangeText}</span>
        <select
          className="contrib-type form-control form-control-sm"
          value={contribType}
          onChange={(e) => setContribType(e.target.value)}
          style={{ width: 120 }}
        >
          <option value="COMMITS">Commits</option>
          <option value="ADDITIONS">Additions</option>
          <option value="DELETIONS">Deletions</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted">Loading...</div>
      ) : Object.keys(overallData).length === 0 ? (
        <div className="overall d-flex align-items-center justify-content-center">
          <div className="no-data">No data</div>
        </div>
      ) : (
        <div className="overall chart" ref={overallRef} />
      )}

      <div className="top-contributors mt-5">
        {topLoading ? (
          <div className="loading" />
        ) : topContributors.length > 0 ? (
          <TopContributorGrid
            contributors={topContributors}
            days={daysRef.current}
            fromDay={fromDay}
            toDay={toDay}
            darkMode={darkMode}
          />
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top Contributor Grid
// ---------------------------------------------------------------------------

function TopContributorGrid({
  contributors,
  days,
  fromDay,
  toDay,
  darkMode,
}: {
  contributors: TopContributor[];
  days: number[];
  fromDay: number;
  toDay: number;
  darkMode: boolean;
}) {
  const rows: TopContributor[][] = [];
  for (let i = 0; i < contributors.length; i += 2) {
    rows.push(contributors.slice(i, i + 2));
  }

  return (
    <>
      {rows.map((row, ri) => (
        <div className="row" key={ri}>
          {row.map((c, ci) => (
            <div className={`col-xl-6 ${ci === 0 ? "left" : "right"}`} key={c.authorEmailAddress}>
              <ContributorCard
                contributor={c}
                index={ri * 2 + ci}
                days={days}
                fromDay={fromDay}
                toDay={toDay}
                darkMode={darkMode}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function ContributorCard({
  contributor: c,
  index,
  days,
  fromDay,
  toDay,
  darkMode,
}: {
  contributor: TopContributor;
  index: number;
  days: number[];
  fromDay: number;
  toDay: number;
  darkMode: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const xAxisData: string[] = [];
    const seriesData: number[] = [];
    for (const d of days) {
      if (d >= fromDay && d <= toDay) {
        xAxisData.push(formatDay(d));
        seriesData.push(c.dailyContributions[d] ?? 0);
      }
    }

    let maxValue = 0;
    for (const v of seriesData) {
      if (v > maxValue) maxValue = v;
    }

    let useKilo = false;
    const grid = { left: "80px", right: "40px", top: "20px", bottom: "20px" };
    chart.setOption({
      grid,
      xAxis: {
        type: "category",
        data: xAxisData,
        boundaryGap: false,
        axisLabel: { color: darkMode ? "#cdcdde" : "#3F4254" },
      },
      yAxis: {
        minInterval: 1,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: darkMode ? "#535370" : "#E4E6EF" } },
        axisLabel: {
          formatter: (value: number) => {
            const r = formatYAxisLabel(value, useKilo);
            useKilo = r.useKilo;
            return r.text;
          },
          color: darkMode ? "#cdcdde" : "#3F4254",
        },
      },
      series: [
        {
          type: "line",
          color: "#FFA800",
          symbol: "none",
          smooth: true,
          sampling: "average",
          animation: false,
          areaStyle: { color: "#FFA800" },
          data: seriesData,
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [c, days, fromDay, toDay, darkMode]);

  return (
    <div className="contrib border rounded p-3 mb-5">
      <div className="head d-flex align-items-center">
        <div className="mr-3 d-flex align-items-center">
          {c.authorAvatarUrl && (
            <img className="avatar mr-3" src={c.authorAvatarUrl} alt="" />
          )}
          <div>
            <div className="font-weight-bold">{c.authorName}</div>
            <div className="total-contribution font-size-sm">
              <a href={c.commitsUrl} className="commits mr-2">
                {c.totalCommits} commits
              </a>
              <span className="additions mr-2">{c.totalAdditions} ++</span>
              <span className="deletions">{c.totalDeletions} --</span>
            </div>
          </div>
        </div>
        <div className="ml-auto font-size-h6 font-weight-bold">#{index + 1}</div>
      </div>
      <div className="body chart" ref={chartRef} />
    </div>
  );
}
