import { describe, expect, it } from "vitest";
import { buildSpecPosition, parseBuildSpecSelection, tabFromSelection, activeElementName } from "./position";
import { parseBuildSpecYaml, serializeBuildSpecYaml } from "./yaml";
import { buildPipeline } from "./pipeline";

describe("buildSpec position", () => {
  it("round-trips selection through position param", () => {
    expect(parseBuildSpecSelection(buildSpecPosition("jobs/CI"))).toBe("jobs/CI");
    expect(parseBuildSpecSelection(buildSpecPosition(null))).toBeNull();
  });

  it("resolves tab from selection", () => {
    expect(tabFromSelection("jobs/CI")).toBe("jobs");
    expect(tabFromSelection("services/db")).toBe("services");
    expect(tabFromSelection("step-templates/t1")).toBe("stepTemplates");
    expect(tabFromSelection("imports")).toBe("imports");
    expect(tabFromSelection(null)).toBe("jobs");
    expect(tabFromSelection("properties")).toBe("properties");
  });

  it("extracts active element name", () => {
    expect(activeElementName("jobs/CI", "jobs")).toBe("CI");
    expect(activeElementName("jobs", "jobs")).toBeNull();
  });
});

describe("buildSpec yaml", () => {
  const sample = `
version: 2
jobs:
  - name: CI
    steps:
      - type: command
        name: build
        image: alpine
        commands: echo hi
services:
  - name: db
    image: postgres:16
properties:
  - name: KEY
    value: val
`;

  it("parses and serializes round-trip", () => {
    const parsed = parseBuildSpecYaml(sample);
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) {
      return;
    }
    expect(parsed.spec.jobs?.[0]?.name).toBe("CI");
    const yaml = serializeBuildSpecYaml(parsed.spec);
    const again = parseBuildSpecYaml(yaml);
    expect("error" in again).toBe(false);
    if ("error" in again) {
      return;
    }
    expect(again.spec.jobs?.[0]?.name).toBe("CI");
    expect(again.spec.services?.[0]?.name).toBe("db");
  });
});

describe("buildSpec pipeline layout", () => {
  it("places leaf jobs in first column", () => {
    const jobs = [
      { name: "A", jobDependencies: [{ jobName: "B" }] },
      { name: "B", jobDependencies: [] },
    ];
    const pipeline = buildPipeline(jobs);
    expect(pipeline[0].map((j) => j.name)).toContain("B");
  });
});
