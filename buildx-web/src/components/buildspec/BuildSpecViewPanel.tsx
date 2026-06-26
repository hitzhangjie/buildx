import { useMemo, type ReactNode } from "react";
import type { BuildSpec, BuildSpecTab } from "../../buildspec/types";
import {
  activeElementName,
  elementSelection,
  tabFromSelection,
} from "../../buildspec/position";
import { JobsViewPanel } from "./JobsViewPanel";
import { ElementsViewPanel } from "./ElementsViewPanel";
import { ServiceViewer, StepTemplateViewer, PropertiesViewer } from "./BeanViewer";
import { ImportsViewPanel } from "./ImportsViewPanel";
import "./build-spec.css";

type BuildSpecViewPanelProps = {
  spec: BuildSpec;
  selection: string | null;
  onSelectionChange: (selection: string | null) => void;
  validationErrors?: string[];
};

const TAB_LINKS: { id: BuildSpecTab; className: string; label: string; segment: string }[] = [
  { id: "jobs", className: "jobs", label: "Jobs", segment: "jobs" },
  { id: "services", className: "services", label: "Services", segment: "services" },
  { id: "stepTemplates", className: "step-templates", label: "Step Templates", segment: "step-templates" },
  { id: "properties", className: "properties", label: "Properties", segment: "properties" },
  { id: "imports", className: "imports", label: "Imports", segment: "imports" },
];

function findActiveIndex<T extends { name?: string }>(items: T[], selection: string | null, segment: string): number {
  const name = activeElementName(selection, segment);
  if (name) {
    const idx = items.findIndex((item) => item.name === name);
    if (idx >= 0) {
      return idx;
    }
  }
  return items.length > 0 ? 0 : -1;
}

export function BuildSpecViewPanel({
  spec,
  selection,
  onSelectionChange,
  validationErrors = [],
}: BuildSpecViewPanelProps) {
  const activeTab = tabFromSelection(selection);

  const jobs = spec.jobs ?? [];
  const services = spec.services ?? [];
  const stepTemplates = spec.stepTemplates ?? [];
  const properties = spec.properties ?? [];
  const imports = spec.imports ?? [];

  const jobsActiveIndex = useMemo(() => findActiveIndex(jobs, selection, "jobs"), [jobs, selection]);
  const servicesActiveIndex = useMemo(
    () => findActiveIndex(services, selection, "services"),
    [services, selection],
  );
  const templatesActiveIndex = useMemo(
    () => findActiveIndex(stepTemplates, selection, "step-templates"),
    [stepTemplates, selection],
  );

  let tabContent: ReactNode = null;
  if (activeTab === "jobs") {
    tabContent =
      jobs.length > 0 ? (
        <JobsViewPanel
          jobs={jobs}
          activeIndex={jobsActiveIndex}
          onActiveIndexChange={(index) => {
            if (index < 0) {
              onSelectionChange("jobs");
            } else {
              onSelectionChange(elementSelection("jobs", jobs[index]?.name));
            }
          }}
        />
      ) : (
        <div className="jobs not-defined alert alert-notice alert-light-warning d-flex">No jobs defined</div>
      );
  } else if (activeTab === "services") {
    tabContent =
      services.length > 0 ? (
        <ElementsViewPanel
          className="services"
          elements={services}
          activeIndex={servicesActiveIndex}
          onActiveIndexChange={(index) => {
            if (index < 0) {
              onSelectionChange("services");
            } else {
              onSelectionChange(elementSelection("services", services[index]?.name));
            }
          }}
          renderDetail={(element) => <ServiceViewer service={element} />}
        />
      ) : (
        <div className="services not-defined alert alert-notice alert-light-warning d-flex">
          No services defined
        </div>
      );
  } else if (activeTab === "stepTemplates") {
    tabContent =
      stepTemplates.length > 0 ? (
        <ElementsViewPanel
          className="step-templates"
          elements={stepTemplates}
          activeIndex={templatesActiveIndex}
          onActiveIndexChange={(index) => {
            if (index < 0) {
              onSelectionChange("step-templates");
            } else {
              onSelectionChange(elementSelection("step-templates", stepTemplates[index]?.name));
            }
          }}
          renderDetail={(element) => <StepTemplateViewer template={element} />}
        />
      ) : (
        <div className="step-templates not-defined alert alert-notice alert-light-warning d-flex">
          No step templates defined
        </div>
      );
  } else if (activeTab === "properties") {
    tabContent = <PropertiesViewer properties={properties} />;
  } else {
    tabContent =
      imports.length > 0 ? (
        <ImportsViewPanel imports={imports} />
      ) : (
        <div className="imports not-defined alert alert-notice alert-light-warning d-flex">No imports defined</div>
      );
  }

  return (
    <div className="build-spec build-spec-view d-flex flex-column flex-grow-1 parseable">
      {validationErrors.length > 0 ? (
        <div className="feedback mx-3 mt-3">
          {validationErrors.map((err, i) => (
            <div key={i} className="alert alert-light-danger">
              {err}
            </div>
          ))}
        </div>
      ) : null}
      <div className="head">
        {TAB_LINKS.map((tab) => (
          <a
            key={tab.id}
            href="#"
            className={`${tab.className}${activeTab === tab.id ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectionChange(tab.segment);
            }}
          >
            {tab.label}
          </a>
        ))}
      </div>
      <div className="body d-flex flex-column flex-grow-1">
        <div className="content">{tabContent}</div>
      </div>
    </div>
  );
}

export function BuildSpecUnparseableViewPanel({ error }: { error: string }) {
  return (
    <div className="build-spec build-spec-view d-flex flex-column flex-grow-1 unparseable">
      <div className="title">Error parsing build spec</div>
      <div className="error-message">{error}</div>
    </div>
  );
}
