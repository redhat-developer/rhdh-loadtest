import type { JSONReport } from '@playwright/test/reporter';

import {
  extractStepDurations,
  formatDuration,
  loadReport,
  parseStatsObject,
  percentile,
  printTable,
} from './utils.mts';

const filename =
  process.argv[2] ?? process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? 'test-results.json';

console.log(`Analyse ${filename}`);

const report: JSONReport = loadReport(filename);
const stepDurations = extractStepDurations(report);

const networkStats: Record<string, unknown>[] = [];
for (const suite of report.suites) {
  for (const spec of suite.specs) {
    for (const test of spec.tests) {
      for (const result of test.results) {
        if (result.status !== 'passed' || !result.stdout) continue;
        for (const entry of result.stdout) {
          if (typeof entry === 'object' && 'text' in entry) {
            const stats = parseStatsObject((entry as { text: string }).text);
            if (stats) networkStats.push(stats);
          }
        }
      }
    }
  }
}

{
  const rows: string[][] = [];
  for (const [title, durations] of stepDurations) {
    const sorted = durations.slice().sort((a, b) => a - b);
    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
    const p90 = percentile(sorted, 90);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    rows.push([
      title,
      String(durations.length),
      formatDuration(avg),
      formatDuration(p90),
      formatDuration(min),
      formatDuration(max),
    ]);
  }

  console.log('');
  console.log('#### Step Durations');
  console.log('');
  printTable(
    ['Step', 'Count', 'Avg', 'P90', 'Min', 'Max'],
    ['left', 'right', 'right', 'right', 'right', 'right'],
    rows,
  );
  console.log('');
}

if (networkStats.length > 0) {
  const topLevel = new Map<string, number>();
  const nested = new Map<string, Map<string, number>>();

  for (const stats of networkStats) {
    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === 'number') {
        topLevel.set(key, (topLevel.get(key) ?? 0) + value);
      } else if (typeof value === 'object' && value !== null) {
        const sub = nested.get(key) ?? new Map<string, number>();
        for (const [subKey, subValue] of Object.entries(value as Record<string, number>)) {
          sub.set(subKey, (sub.get(subKey) ?? 0) + subValue);
        }
        nested.set(key, sub);
      }
    }
  }

  const count = networkStats.length;

  console.log(`#### Network Stats (based on ${count} runs)`);
  console.log('');
  {
    const rows = [...topLevel].map(([key, sum]) => [key, String(sum), (sum / count).toFixed(1)]);
    printTable(['Metric', 'Sum', 'Avg'], ['left', 'right', 'right'], rows);
  }

  for (const [category, sums] of nested) {
    console.log('');
    console.log(`#### ${category}`);
    console.log('');
    const rows = [...sums].map(([key, sum]) => [key, String(sum), (sum / count).toFixed(1)]);
    printTable(['Key', 'Sum', 'Avg'], ['left', 'right', 'right'], rows);
  }

  console.log('');
}
