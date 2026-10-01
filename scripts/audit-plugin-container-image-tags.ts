#!/usr/bin/env -S node --experimental-strip-types

/**
 * Audits Quay tags for quay.io/rhdh-community/rhdh-loadtest-plugins.
 *
 * Expected tag format: bs_<version>_<plugin>-<n>
 * Example: bs_1.42_catalog-tab-100
 *
 * Groups by prefix through the 2nd "_" plus the plugin name (suffix after
 * the last "-" removed), then checks that numbers 1–100 exist and reports
 * oldest/newest upload times for that set.
 *
 * Usage:
 *   ./scripts/audit-plugin-container-image-tags.ts
 *   node --experimental-strip-types scripts/audit-plugin-container-image-tags.ts
 */

const REPOSITORY = 'rhdh-community/rhdh-loadtest-plugins';
const QUAY_TAG_API = `https://quay.io/api/v1/repository/${REPOSITORY}/tag/`;
const EXPECTED_MIN = 1;
const EXPECTED_MAX = 100;

/** e.g. bs_1.42_catalog-tab-100 → group bs_1.42_catalog-tab, n 100 */
const EXPECTED_TAG =
  /^(?<prefix>[^_]+_[^_]+)_(?<plugin>.+)-(?<n>\d+)$/;

type QuayTag = {
  name: string;
  start_ts?: number;
  last_modified?: string;
};

type ParsedTag = {
  name: string;
  group: string;
  n: number;
  uploadedAt: Date;
};

async function fetchAllTags(): Promise<QuayTag[]> {
  const tags: QuayTag[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(QUAY_TAG_API);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '100');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Quay API request failed (${response.status} ${response.statusText}): ${url}`,
      );
    }

    const body = (await response.json()) as {
      tags: QuayTag[];
      has_additional: boolean;
    };

    tags.push(...body.tags);
    if (!body.has_additional) {
      break;
    }
    page += 1;
  }

  return tags;
}

function parseUploadedAt(tag: QuayTag): Date {
  if (typeof tag.start_ts === 'number') {
    return new Date(tag.start_ts * 1000);
  }
  if (tag.last_modified) {
    return new Date(tag.last_modified);
  }
  return new Date(NaN);
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + ' '.repeat(width - value.length);
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function missingNumbers(present: Set<number>): number[] {
  const missing: number[] = [];
  for (let n = EXPECTED_MIN; n <= EXPECTED_MAX; n += 1) {
    if (!present.has(n)) {
      missing.push(n);
    }
  }
  return missing;
}

/** Compact consecutive ints: [1,2,3,5,7,8] → "1-3,5,7-8" */
function formatNumberRanges(numbers: number[]): string {
  if (numbers.length === 0) {
    return '-';
  }

  const ranges: string[] = [];
  let start = numbers[0]!;
  let prev = numbers[0]!;

  for (let i = 1; i < numbers.length; i += 1) {
    const current = numbers[i]!;
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? String(start) : `${start}-${prev}`);
    start = current;
    prev = current;
  }
  ranges.push(start === prev ? String(start) : `${start}-${prev}`);
  return ranges.join(',');
}

function printTable(
  rows: Array<{
    group: string;
    present: string;
    missing: string;
    oldest: string;
    newest: string;
  }>,
): void {
  const headers = {
    group: 'Group',
    present: 'Present',
    missing: 'Missing',
    oldest: 'Oldest upload',
    newest: 'Newest upload',
  };

  const widths = {
    group: Math.max(headers.group.length, ...rows.map((r) => r.group.length)),
    present: Math.max(
      headers.present.length,
      ...rows.map((r) => r.present.length),
    ),
    missing: Math.max(
      headers.missing.length,
      ...rows.map((r) => r.missing.length),
    ),
    oldest: Math.max(headers.oldest.length, ...rows.map((r) => r.oldest.length)),
    newest: Math.max(headers.newest.length, ...rows.map((r) => r.newest.length)),
  };

  const line = (row: typeof headers) =>
    [
      pad(row.group, widths.group),
      pad(row.present, widths.present),
      pad(row.missing, widths.missing),
      pad(row.oldest, widths.oldest),
      pad(row.newest, widths.newest),
    ].join('  ');

  console.log(line(headers));
  console.log(
    [
      '-'.repeat(widths.group),
      '-'.repeat(widths.present),
      '-'.repeat(widths.missing),
      '-'.repeat(widths.oldest),
      '-'.repeat(widths.newest),
    ].join('  '),
  );

  for (const row of rows) {
    console.log(line(row));
  }
}

async function main(): Promise<void> {
  console.log(`Fetching tags for quay.io/${REPOSITORY} ...`);
  const tags = await fetchAllTags();
  console.log(`Fetched ${tags.length} tags.\n`);

  const unexpected: string[] = [];
  const groups = new Map<string, ParsedTag[]>();

  for (const tag of tags) {
    const match = EXPECTED_TAG.exec(tag.name);
    if (!match?.groups) {
      unexpected.push(tag.name);
      continue;
    }

    const n = Number(match.groups.n);
    if (n < EXPECTED_MIN || n > EXPECTED_MAX) {
      unexpected.push(tag.name);
      continue;
    }

    const group = `${match.groups.prefix}_${match.groups.plugin}`;
    const parsed: ParsedTag = {
      name: tag.name,
      group,
      n,
      uploadedAt: parseUploadedAt(tag),
    };

    const list = groups.get(group) ?? [];
    list.push(parsed);
    groups.set(group, list);
  }

  const sortedGroups = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const rows = sortedGroups.map((group) => {
    const entries = groups.get(group)!;
    const byNumber = new Map<number, ParsedTag>();
    for (const entry of entries) {
      const existing = byNumber.get(entry.n);
      if (!existing || entry.uploadedAt > existing.uploadedAt) {
        byNumber.set(entry.n, entry);
      }
    }

    const present = new Set(byNumber.keys());
    const missing = missingNumbers(present);
    const uploads = [...byNumber.values()];
    let oldest: ParsedTag | undefined;
    let newest: ParsedTag | undefined;
    for (const entry of uploads) {
      if (!oldest || entry.uploadedAt < oldest.uploadedAt) {
        oldest = entry;
      }
      if (!newest || entry.uploadedAt > newest.uploadedAt) {
        newest = entry;
      }
    }

    return {
      group,
      present: `${present.size}/${EXPECTED_MAX}`,
      missing: formatNumberRanges(missing),
      oldest: oldest
        ? `#${oldest.n}  ${formatDate(oldest.uploadedAt)}`
        : 'unknown',
      newest: newest
        ? `#${newest.n}  ${formatDate(newest.uploadedAt)}`
        : 'unknown',
    };
  });

  if (rows.length === 0) {
    console.log('No expected tag groups found.');
  } else {
    printTable(rows);
  }

  if (unexpected.length > 0) {
    console.log('\nUnexpected tags:');
    for (const name of unexpected.sort((a, b) => a.localeCompare(b))) {
      console.log(`  ${name}`);
    }
  } else {
    console.log('\nNo unexpected tags.');
  }

  const incomplete = rows.some((r) => !r.present.startsWith(`${EXPECTED_MAX}/`));
  if (incomplete || unexpected.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
