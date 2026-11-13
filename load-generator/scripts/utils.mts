import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { JSONReport, JSONReportTestStep } from '@playwright/test/reporter';

export type Align = 'left' | 'right';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const ORANGE = '\x1b[38;5;208m';

const forceColor = process.env.FORCE_COLOR;
const useColor =
  forceColor === '0' || forceColor === 'false'
    ? false
    : Boolean(forceColor) || (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function colorize(text: string, code: string | null): string {
  if (!code || !useColor) return text;
  return `${code}${text}${RESET}`;
}

function durationBody(ms: number, signed = false): string {
  const abs = Math.abs(ms);
  const body = abs > 1000 ? `${(abs / 1000).toFixed(1)}s` : `${abs.toFixed(0)}ms`;
  if (ms < 0) return `-${body}`;
  if (signed && ms > 0) return `+${body}`;
  return body;
}

/** Absolute duration color: >10s red, >5s orange. */
function durationColor(ms: number): string | null {
  const abs = Math.abs(ms);
  if (abs > 10_000) return RED;
  if (abs > 5_000) return ORANGE;
  return null;
}

/** Format an absolute step duration (avg/p90/min/max). */
export function formatDuration(ms: number): string {
  return colorize(durationBody(ms), durationColor(ms));
}

/** Signed delta ms: <-1000 green, >5000 red, >2000 yellow. */
export function formatDeltaMs(ms: number): string {
  let code: string | null = null;
  if (ms < -1000) code = GREEN;
  else if (ms > 5000) code = RED;
  else if (ms > 2000) code = YELLOW;
  return colorize(durationBody(ms, true), code);
}

/** Delta percent: <-10% green, >+20% red, >+10% yellow. */
export function formatDeltaPercent(delta: number, base: number): string {
  if (base === 0) return delta === 0 ? '0%' : 'n/a';
  const pct = (delta / base) * 100;
  const body = `${Math.abs(pct).toFixed(1)}%`;
  const text = pct < 0 ? `-${body}` : pct > 0 ? `+${body}` : body;
  let code: string | null = null;
  if (pct < -10) code = GREEN;
  else if (pct > 20) code = RED;
  else if (pct > 10) code = YELLOW;
  return colorize(text, code);
}

export function printTable(headers: string[], aligns: Align[], rows: string[][]) {
  const widths = headers.map((h, i) =>
    Math.max(stripAnsi(h).length, ...rows.map(r => stripAnsi(r[i] ?? '').length)),
  );
  const pad = (s: string, w: number, a: Align) => {
    const padLen = w - stripAnsi(s).length;
    if (padLen <= 0) return s;
    const padding = ' '.repeat(padLen);
    return a === 'right' ? padding + s : s + padding;
  };
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

export function average(durations: number[]): number {
  return durations.reduce((s, d) => s + d, 0) / durations.length;
}

export function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function recordDuration(map: Map<string, number[]>, title: string, duration: number) {
  const durations = map.get(title) ?? [];
  durations.push(duration);
  map.set(title, durations);
}

/** Walk nested Playwright steps depth-first; path is parent/child for uniqueness. */
function collectSteps(map: Map<string, number[]>, steps: JSONReportTestStep[], parentPath = '') {
  for (const step of steps) {
    const path = parentPath ? `${parentPath}/${step.title}` : step.title;
    recordDuration(map, path, step.duration);
    if (step.steps?.length) {
      collectSteps(map, step.steps, path);
    }
  }
}

/** Extract step durations (including nested paths and `all`) from a Playwright JSON report. */
export function extractStepDurations(report: JSONReport): Map<string, number[]> {
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
            collectSteps(stepDurations, result.steps);
            recordDuration(stepDurations, 'all', result.duration);
          }
        }
      }
    }
  }

  return stepDurations;
}

export function loadReport(filename: string): JSONReport {
  return JSON.parse(readFileSync(filename, 'utf-8'));
}

/** Per-step average durations, preserving first-seen step order. */
export function stepAverages(filename: string): { label: string; averages: Map<string, number> } {
  const report = loadReport(filename);
  const durations = extractStepDurations(report);
  const averages = new Map<string, number>();
  for (const [title, values] of durations) {
    averages.set(title, average(values));
  }
  return { label: basename(filename), averages };
}

export function parseStatsObject(text: string): Record<string, unknown> | null {
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
