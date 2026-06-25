import { readFileSync } from 'node:fs';

import type { JSONReport } from '@playwright/test/reporter';

const filename = 'test-results.json';

console.log(`Analyse ${filename}`);

const report: JSONReport = JSON.parse(readFileSync(filename, 'utf-8'));

const stepDurations = new Map<string, number[]>();

for (const suite of report.suites) {
  for (const spec of suite.specs) {
    if (!spec.ok) {
      console.warn(`Unexpected test spec "${spec.ok}" in "${spec.title}"`);
      continue;
    }
    for (const test of spec.tests) {
      if (test.status !== 'expected') {
        console.warn(`Unexpected test status "${test.status}" in "${spec.title}"`);
        continue;
      }
      for (const result of test.results) {
        if (result.status !== 'passed') {
          console.warn(`Unexpected test result status (${result.status}) in "${spec.title}"`);
          continue;
        }
        if (result.steps) {
          for (const step of result.steps) {
            const durations = stepDurations.get(step.title) ?? [];
            durations.push(step.duration);
            stepDurations.set(step.title, durations);
          }
          const durations = stepDurations.get('all') ?? [];
          durations.push(result.duration);
          stepDurations.set('all', durations);
        }
      }
    }
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

console.log('');
console.log(
  'Step'.padEnd(20),
  'Count'.padStart(10),
  'Avg'.padStart(10),
  'P95'.padStart(10),
  'Min'.padStart(10),
  'Max'.padStart(10),
);
console.log('-'.repeat(75));

for (const [title, durations] of stepDurations) {
  const sorted = durations.slice().sort((a, b) => a - b);
  const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
  const p95 = percentile(sorted, 95);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  console.log(
    title.padEnd(20),
    String(durations.length).padStart(10),
    `${avg.toFixed(0)}ms`.padStart(10),
    `${p95.toFixed(0)}ms`.padStart(10),
    `${min}ms`.padStart(10),
    `${max}ms`.padStart(10),
  );
}

console.log('');
