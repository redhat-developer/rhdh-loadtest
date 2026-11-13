import {
  formatDeltaMs,
  formatDeltaPercent,
  formatDuration,
  printTable,
  stepAverages,
  type Align,
} from './utils.mts';

const files = process.argv.slice(2);

if (files.length < 2) {
  console.error('Usage: node scripts/compare.mts <baseline.json> <other.json> [more.json...]');
  process.exit(1);
}

const reports = files.map(stepAverages);
const [baseline, ...others] = reports;

const subscripts = '₀₁₂₃₄₅₆₇₈₉';
function sub(n: number): string {
  return String(n).split('').map(d => subscripts[Number(d)]).join('');
}

const stepOrder: string[] = [];
const seen = new Set<string>();
for (const report of reports) {
  for (const step of report.averages.keys()) {
    if (!seen.has(step)) {
      seen.add(step);
      stepOrder.push(step);
    }
  }
}

const headers = [
  'Step',
  ...reports.map((_, i) => `Avg${sub(i + 1)}`),
  ...others.flatMap((_, i) => {
    const n = sub(i + 2);
    return [`Δ${n}`, `Δ${n}%`];
  }),
];
const aligns: Align[] = ['left', ...headers.slice(1).map(() => 'right' as const)];

const rows: string[][] = [];
for (const step of stepOrder) {
  const baseAvg = baseline.averages.get(step);
  const row: string[] = [step];

  for (const report of reports) {
    const avg = report.averages.get(step);
    row.push(avg === undefined ? '-' : formatDuration(avg));
  }

  for (const report of others) {
    const avg = report.averages.get(step);
    if (baseAvg === undefined || avg === undefined) {
      row.push('-', '-');
      continue;
    }
    const delta = avg - baseAvg;
    row.push(formatDeltaMs(delta), formatDeltaPercent(delta, baseAvg));
  }

  rows.push(row);
}

console.log('');
console.log('#### Step Average Diff');
console.log('');
printTable(headers, aligns, rows);
console.log('');
for (const [i, report] of reports.entries()) {
  const role = i === 0 ? 'baseline' : 'compare';
  console.log(`${sub(i + 1)} ${report.label} (${role})`);
}
console.log('');
