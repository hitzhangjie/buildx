import { useCallback, useMemo, type ReactNode } from "react";
import type { BuildSpec, BuildSpecTab } from "../../buildspec/types";
import {
  activeElementName,
  elementSelection,
  tabFromSelection,
} from "../../buildspec/position";
import { JobsEditorPanel } from "./JobsEditorPanel";
import { ElementsEditorPanel } from "./ElementsEditorPanel";
import { ServiceEditorPanel } from "./ServiceEditorPanel";
import { StepTemplateEditorPanel } from "./StepTemplateEditorPanel";
import { PropertiesEditorPanel } from "./PropertiesEditorPanel";
import { ImportsEditorPanel } from "./ImportsEditorPanel";
import "./build-spec.css";

type BuildSpecEditPanelProps = {
  spec: BuildSpec;
  selection: string | null;
  onSpecChange: (spec: BuildSpec) => void;
  onSelectionChange: (selection: string | null) => void;
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

export function BuildSpecEditPanel({
  spec,
  selection,
  onSpecChange,
  onSelectionChange,
}: BuildSpecEditPanelProps) {
  const activeTab = tabFromSelection(selection);

  const updateSpec = useCallback(
    (patch: Partial<BuildSpec>) => {
      onSpecChange({ ...spec, ...patch });
    },
    [onSpecChange, spec],
  );

  const switchTab = (_tab: BuildSpecTab, segment: string) => {
    onSelectionChange(segment);
  };

  const jobs = spec.jobs ?? [];
  const services = spec.services ?? [];
  const stepTemplates = spec.stepTemplates ?? [];
  const properties = spec.properties ?? [];
  const imports = spec.imports ?? [];

  const jobsActiveIndex = useMemo(
    () => findActiveIndex(jobs, selection, "jobs"),
    [jobs, selection],
  );
  const servicesActiveIndex = useMemo(
    () => findActiveIndex(services, selection, "services"),
    [services, selection],
  );
  const templatesActiveIndex = useMemo(
    () => findActiveIndex(stepTemplates, selection, "step-templates"),
    [stepTemplates, selection],
  );

  const handleJobsActiveChange = (index: number) => {
    if (index < 0) {
      onSelectionChange("jobs");
      return;
    }
    onSelectionChange(elementSelection("jobs", jobs[index]?.name));
  };

  const handleServicesActiveChange = (index: number) => {
    if (index < 0) {
      onSelectionChange("services");
      return;
    }
    onSelectionChange(elementSelection("services", services[index]?.name));
  };

  const handleTemplatesActiveChange = (index: number) => {
    if (index < 0) {
      onSelectionChange("step-templates");
      return;
    }
    onSelectionChange(elementSelection("step-templates", stepTemplates[index]?.name));
  };

  let tabContent: ReactNode = null;
  if (activeTab === "jobs") {
    tabContent = (
      <JobsEditorPanel
        jobs={jobs}
        activeIndex={jobsActiveIndex}
        onActiveIndexChange={handleJobsActiveChange}
        onJobsChange={(next) => updateSpec({ jobs: next })}
      />
    );
  } else if (activeTab === "services") {
    tabContent = (
      <ElementsEditorPanel
        className="services"
        elements={services}
        activeIndex={servicesActiveIndex}
        onActiveIndexChange={handleServicesActiveChange}
        onElementsChange={(next) => updateSpec({ services: next })}
        createElement={() => ({ name: "", image: "" })}
        renderDetail={(element, _index, update) => (
          <ServiceEditorPanel service={element} onChange={update} />
        )}
      />
    );
  } else if (activeTab === "stepTemplates") {
    tabContent = (
      <ElementsEditorPanel
        className="step-templates"
        elements={stepTemplates}
        activeIndex={templatesActiveIndex}
        onActiveIndexChange={handleTemplatesActiveChange}
        onElementsChange={(next) => updateSpec({ stepTemplates: next })}
        createElement={() => ({ name: "", steps: [] })}
        renderDetail={(element, _index, update) => (
          <StepTemplateEditorPanel template={element} onChange={update} />
        )}
      />
    );
  } else if (activeTab === "properties") {
    tabContent = (
      <PropertiesEditorPanel
        properties={properties}
        onChange={(next) => updateSpec({ properties: next })}
      />
    );
  } else {
    tabContent = (
      <ImportsEditorPanel imports={imports} onChange={(next) => updateSpec({ imports: next })} />
    );
  }

  return (
    <div className="build-spec build-spec-edit d-flex flex-column flex-grow-1 parseable">
      <div className="head">
        {TAB_LINKS.map((tab) => (
          <a
            key={tab.id}
            href="#"
            className={`${tab.className}${activeTab === tab.id ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              switchTab(tab.id, tab.segment);
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

export function BuildSpecUnparseablePanel({ error }: { error: string }) {
  return (
    <div className="build-spec build-spec-edit d-flex flex-column flex-grow-1 unparseable">
      <div className="title">Error parsing build spec</div>
      <div className="error-message">{error}</div>
    </div>
  );
}
