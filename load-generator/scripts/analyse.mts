import { readFileSync } from 'node:fs';

import type { JSONReport } from '@playwright/test/reporter';

const filename = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? 'test-results.json';

console.log(`Analyse ${filename}`);

const report: JSONReport = JSON.parse(readFileSync(filename, 'utf-8'));

const stepDurations = new Map<string, number[]>();

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function parseStatsObject(text: string): Record<string, unknown> | null {
  const clean = stripAnsi(text).trim();
  if (!clean.startsWith('Stats:')) return null;
  const objStr = clean.slice('Stats:'.length).trim();
  let json = objStr.replace(/(?<=[\s,{])(\w+)(?=\s*:)/g, '"$1"');
  json = json.replace(/'/g, '"');
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const networkStats: Record<string, unknown>[] = [];

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
        if (result.stdout) {
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
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

type Align = 'left' | 'right';

function printTable(headers: string[], aligns: Align[], rows: string[][]) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length)),
  );
  const pad = (s: string, w: number, a: Align) =>
    a === 'right' ? s.padStart(w) : s.padEnd(w);
  const formatRow = (cells: string[]) =>
    '| ' + cells.map((c, i) => pad(c, widths[i], aligns[i])).join(' | ') + ' |';
  const separator =
    '| ' + widths.map((w, i) => {
      const dashes = '-'.repeat(w);
      return aligns[i] === 'right' ? dashes.slice(0, -1) + ':' : dashes;
    }).join(' | ') + ' |';

  console.log(formatRow(headers));
  console.log(separator);
  for (const row of rows) {
    console.log(formatRow(row));
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
    rows.push([title, String(durations.length), `${avg.toFixed(0)}ms`, `${p90.toFixed(0)}ms`, `${min}ms`, `${max}ms`]);
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
