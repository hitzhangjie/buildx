import type { Job, JobDependency } from "./types";

/** Column/row position of a job in the visual pipeline DAG. */
export type PipelineJobIndex = {
  column: number;
  row: number;
};

/** Build pipeline columns from flat job list (OneDev PipelinePanel.buildPipeline). */
export function buildPipeline(jobs: Job[]): Job[][] {
  if (jobs.length === 0) {
    return [[]];
  }

  const remaining = [...jobs];
  const pipeline: Job[][] = [];
  const jobNames = new Set(jobs.map((j) => j.name).filter(Boolean) as string[]);

  const leafJobs: Job[] = [];
  for (let i = remaining.length - 1; i >= 0; i--) {
    const job = remaining[i];
    const deps = job.jobDependencies ?? [];
    const hasInternalDep = deps.some((d) => d.jobName && jobNames.has(d.jobName));
    if (!hasInternalDep) {
      leafJobs.unshift(remaining.splice(i, 1)[0]);
    }
  }

  if (leafJobs.length === 0 && remaining.length > 0) {
    leafJobs.push(remaining.shift()!);
  }

  pipeline.push(leafJobs);

  if (remaining.length > 0) {
    pipeline.push(...buildPipeline(remaining));
  }

  return pipeline;
}

export function pipelineJobIndex(pipeline: Job[][], job: Job): PipelineJobIndex | null {
  for (let column = 0; column < pipeline.length; column++) {
    const row = pipeline[column].indexOf(job);
    if (row >= 0) {
      return { column, row };
    }
  }
  return null;
}

export function jobAtIndex(pipeline: Job[][], index: PipelineJobIndex): Job | null {
  return pipeline[index.column]?.[index.row] ?? null;
}

/** Dependency map: "column-row" -> list of upstream "column-row" keys. */
export function buildDependencyMap(pipeline: Job[][]): Record<string, string[]> {
  const jobIndexMap = new Map<string, PipelineJobIndex>();
  pipeline.forEach((column, columnIndex) => {
    column.forEach((job, rowIndex) => {
      if (job.name) {
        jobIndexMap.set(job.name, { column: columnIndex, row: rowIndex });
      }
    });
  });

  const dependencyMap: Record<string, string[]> = {};
  for (const column of pipeline) {
    for (const job of column) {
      const jobIndex = job.name ? jobIndexMap.get(job.name) : null;
      if (!jobIndex) {
        continue;
      }
      const key = `${jobIndex.column}-${jobIndex.row}`;
      const upstream: string[] = [];
      for (const dep of job.jobDependencies ?? []) {
        const depIndex = dep.jobName ? jobIndexMap.get(dep.jobName) : null;
        if (depIndex && depIndex.column < jobIndex.column) {
          upstream.push(`${depIndex.column}-${depIndex.row}`);
        }
      }
      dependencyMap[key] = upstream;
    }
  }
  return dependencyMap;
}

export function flatIndexFromPipeline(pipeline: Job[][], jobs: Job[], index: PipelineJobIndex): number {
  const job = jobAtIndex(pipeline, index);
  return job ? jobs.indexOf(job) : -1;
}

export function moveJobInList(jobs: Job[], fromIndex: number, toIndex: number): Job[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return jobs;
  }
  const next = [...jobs];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function adjustActiveIndexAfterMove(
  activeIndex: number,
  fromIndex: number,
  toIndex: number,
): number {
  if (activeIndex < 0) {
    return activeIndex;
  }
  if (fromIndex < activeIndex) {
    if (toIndex >= activeIndex) {
      return activeIndex - 1;
    }
  } else if (fromIndex === activeIndex) {
    return toIndex;
  } else if (toIndex <= activeIndex) {
    return activeIndex + 1;
  }
  return activeIndex;
}

export function dependencyJobNames(job: Job): string[] {
  return (job.jobDependencies ?? [])
    .map((d: JobDependency) => d.jobName)
    .filter((n): n is string => Boolean(n));
}
