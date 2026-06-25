import { useParams } from "react-router-dom";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import { Icon } from "../../../components/onedev/Icon";
import "./build-detail.css";

/**
 * BuildReportPage — displays a specific report for a build.
 *
 * Reports can include: test results, code coverage, static analysis
 * findings, checkstyle violations, etc. Each report type has its own
 * tab and is rendered by a report-specific component.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/report/BuildReportPage.html
 * URL pattern: /{project}/~builds/:build/reports/:report
 */
export function BuildReportPage() {
  const { projectPath, build, loading, error } = useBuildDetail();
  const { report: reportType } = useParams<{ report: string }>();

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="reports"
    >
      <div className="build-report">
        {build && (
          <ReportContent reportType={reportType ?? "unknown"} />
        )}
        {!build && !loading && (
          <div className="text-muted py-5 text-center">
            Build not found
          </div>
        )}
        {loading && (
          <div className="text-center py-10 text-muted">Loading…</div>
        )}
      </div>
    </BuildDetailLayout>
  );
}

function ReportContent({ reportType }: { reportType: string }) {
  const reportLabel = formatReportName(reportType);

  return (
    <div>
      {/* Report header */}
      <div className="border rounded p-3 mb-4 bg-light">
        <div className="font-weight-bolder mb-2">
          <Icon name="chart" />
          <span className="ml-2">{reportLabel}</span>
        </div>
        <p className="text-muted font-size-sm mb-0">
          Report data will be available when the CI engine publishes build
          reports. Supported report types include: test results, code coverage,
          static analysis, and custom reports.
        </p>
      </div>

      {/* Report content placeholder */}
      <div className="border rounded p-5 text-center">
        <div className="text-muted">
          <Icon name="file-chart" />
          <span className="ml-2">
            No {reportLabel.toLowerCase()} data available for this build.
          </span>
        </div>
        <p className="font-size-sm text-muted mt-3 mb-0">
          Reports are published by build steps using the Publish Report action.
          Each report type can contain structured data with charts, tables,
          and metrics.
        </p>
      </div>
    </div>
  );
}

function formatReportName(type: string): string {
  const names: Record<string, string> = {
    "jest-test": "Jest Test Report",
    "jest-coverage": "Jest Coverage Report",
    "checkstyle": "Checkstyle Report",
    "clover": "Clover Coverage Report",
    "phpunit": "PHPUnit Test Report",
    "trx": ".NET Test Report",
    "junit": "JUnit Test Report",
    "problem": "Problem Report",
  };
  return names[type] ?? type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
