import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { finished } from 'node:stream/promises';

export const NETWORK_THROTTLING_OPTIONS = ['none', 'fast', 'medium', 'slow'] as const;
export type NetworkThrottling = (typeof NETWORK_THROTTLING_OPTIONS)[number];

export const DEFAULT_NAMESPACE = 'rhdh-loadtest';
export const DEFAULT_TIMEOUT = '30m';
export const DEFAULT_IMAGE = 'quay.io/rhdh-community/rhdh-loadtest-generator';
export const DEFAULT_LOG_DIR = 'logs';

export type RunJobOptions = {
  rhdhUrl: string;
  loops: number;
  networkThrottling: NetworkThrottling;
  namespace?: string;
  timeout?: string;
  image?: string;
  /** When set, stream is also written to this path. */
  logFile?: string;
};

export function isNetworkThrottling(value: string): value is NetworkThrottling {
  return (NETWORK_THROTTLING_OPTIONS as readonly string[]).includes(value);
}

export function assertNetworkThrottling(value: string): NetworkThrottling {
  if (!isNetworkThrottling(value)) {
    throw new Error(
      `Invalid networkThrottling "${value}". Expected one of: ${NETWORK_THROTTLING_OPTIONS.join(', ')}`,
    );
  }
  return value;
}

/** Keep only filesystem-safe characters for log name segments. */
export function sanitizeSegment(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleaned) {
    throw new Error(`Invalid log name segment: "${value}"`);
  }
  return cleaned;
}

export function buildLogFilePath(opts: {
  name: string;
  prefix?: string;
  suffix?: string;
  logDir?: string;
}): string {
  const parts: string[] = [];
  if (opts.prefix) parts.push(sanitizeSegment(opts.prefix));
  parts.push(sanitizeSegment(opts.name));
  if (opts.suffix) parts.push(sanitizeSegment(opts.suffix));
  return join(opts.logDir ?? DEFAULT_LOG_DIR, `${parts.join('-')}.log`);
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

export function buildJobYaml(opts: {
  rhdhUrl: string;
  loops: number;
  networkThrottling: NetworkThrottling;
  image?: string;
}): string {
  const image = opts.image ?? DEFAULT_IMAGE;
  return `apiVersion: batch/v1
kind: Job
metadata:
  generateName: rhdh-loadtest-
spec:
  ttlSecondsAfterFinished: 86400
  backoffLimit: 0
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: loadtest
          image: ${yamlQuote(image)}
          env:
            - name: FORCE_COLOR
              value: "true"
            - name: PLAYWRIGHT_JSON_OUTPUT_FILE
              value: /tmp/playwright/test-results.json
            - name: RHDH_URL
              value: ${yamlQuote(opts.rhdhUrl)}
            - name: LOOPS
              value: ${yamlQuote(String(opts.loops))}
            - name: NETWORK_THROTTLING
              value: ${yamlQuote(opts.networkThrottling)}
          command: ["sh", "-c", "yarn playwright test --output /tmp/playwright/test-results && yarn analyse"]
`;
}

function runKubectl(
  args: string[],
  opts: { input?: string; capture?: boolean } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('kubectl', args, {
      stdio: [opts.input !== undefined ? 'pipe' : 'ignore', opts.capture ? 'pipe' : 'inherit', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    if (opts.capture && child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
        if (!opts.capture) process.stderr.write(chunk);
      });
    }

    if (opts.input !== undefined && child.stdin) {
      child.stdin.end(opts.input);
    }

    child.on('error', reject);
    child.on('close', code => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

async function ensureNamespace(namespace: string): Promise<void> {
  const rendered = await runKubectl(
    ['create', 'namespace', namespace, '--dry-run=client', '-o', 'yaml'],
    { capture: true },
  );
  if (rendered.code !== 0) {
    throw new Error(`Failed to render namespace YAML:\n${rendered.stderr}`);
  }
  const applied = await runKubectl(['apply', '-f', '-'], { input: rendered.stdout, capture: true });
  if (applied.code !== 0) {
    throw new Error(`Failed to apply namespace:\n${applied.stderr}`);
  }
}

async function createJob(namespace: string, yaml: string): Promise<string> {
  const result = await runKubectl(
    ['create', '-n', namespace, '-f', '-', '-o', 'jsonpath={.metadata.name}'],
    { input: yaml, capture: true },
  );
  if (result.code !== 0) {
    throw new Error(`Failed to create Job:\n${result.stderr}`);
  }
  const name = result.stdout.trim();
  if (!name) {
    throw new Error('kubectl create returned an empty Job name');
  }
  return name;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Parse kubectl-style durations like 30s / 5m / 1h. */
export function parseTimeoutMs(timeout: string): number {
  const match = /^(\d+)(s|m|h)$/.exec(timeout.trim());
  if (!match) {
    throw new Error(`Unsupported timeout "${timeout}". Use Ns, Nm, or Nh (e.g. 30m).`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60_000;
  return value * 3_600_000;
}

export function isPodPhaseLoggable(phase: string): boolean {
  return phase === 'Running' || phase === 'Succeeded' || phase === 'Failed';
}

/**
 * Wait until the Job's pod can serve container logs.
 * `kubectl logs job/...` fails with BadRequest while the container is still ContainerCreating;
 * --pod-running-timeout does not cover that case for job/ targets.
 */
async function waitForJobPodLoggable(
  namespace: string,
  jobName: string,
  timeout: string,
): Promise<string> {
  const deadline = Date.now() + parseTimeoutMs(timeout);

  while (Date.now() < deadline) {
    const result = await runKubectl(
      [
        'get',
        'pods',
        '-n',
        namespace,
        '-l',
        `job-name=${jobName}`,
        '-o',
        'jsonpath={range .items[*]}{.metadata.name}{"\\t"}{.status.phase}{"\\n"}{end}',
      ],
      { capture: true },
    );

    if (result.code === 0) {
      for (const line of result.stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [podName, phase] = trimmed.split('\t');
        if (podName && phase && isPodPhaseLoggable(phase)) {
          return podName;
        }
      }
    }

    await sleep(2000);
  }

  throw new Error(
    `Timed out waiting for a loggable pod for job/${jobName} (timeout=${timeout})`,
  );
}

async function fetchJobLogs(namespace: string, jobName: string): Promise<string> {
  const result = await runKubectl(
    ['logs', '-n', namespace, `job/${jobName}`, '--all-containers'],
    { capture: true },
  );
  if (result.code !== 0) {
    throw new Error(`Failed to fetch logs for job/${jobName}:\n${result.stderr}`);
  }
  return result.stdout;
}

function streamPodLogs(opts: {
  namespace: string;
  podName: string;
  timeout: string;
  logFile?: string;
}): { done: Promise<number>; stop: () => void } {
  const args = [
    'logs',
    '-f',
    '-n',
    opts.namespace,
    `pod/${opts.podName}`,
    '--all-containers',
    `--pod-running-timeout=${opts.timeout}`,
  ];

  const child = spawn('kubectl', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let writeStream: ReturnType<typeof createWriteStream> | undefined;

  if (opts.logFile) {
    mkdirSync(dirname(opts.logFile), { recursive: true });
    writeStream = createWriteStream(opts.logFile, { flags: 'w' });
  }

  const pipeChunk = (chunk: Buffer | string, toStderr = false) => {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    if (toStderr) process.stderr.write(buf);
    else process.stdout.write(buf);
    writeStream?.write(buf);
  };

  child.stdout?.on('data', (chunk: Buffer) => pipeChunk(chunk));
  child.stderr?.on('data', (chunk: Buffer) => pipeChunk(chunk, true));

  const done = new Promise<number>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', async code => {
      if (writeStream) {
        writeStream.end();
        try {
          await finished(writeStream);
        } catch {
          // ignore close errors after premature kill
        }
      }
      resolve(code ?? 1);
    });
  });

  return {
    done,
    stop: () => {
      if (!child.killed) child.kill('SIGTERM');
    },
  };
}

async function waitForJob(namespace: string, jobName: string, timeout: string): Promise<'complete' | 'failed'> {
  const complete = spawn(
    'kubectl',
    ['wait', '-n', namespace, '--for=condition=complete', `--timeout=${timeout}`, `job/${jobName}`],
    { stdio: 'ignore' },
  );
  const failed = spawn(
    'kubectl',
    ['wait', '-n', namespace, '--for=condition=failed', `--timeout=${timeout}`, `job/${jobName}`],
    { stdio: 'ignore' },
  );

  return new Promise<'complete' | 'failed'>((resolve, reject) => {
    let settled = false;
    let completeCode: number | null = null;
    let failedCode: number | null = null;

    const settle = (result: 'complete' | 'failed') => {
      if (settled) return;
      settled = true;
      if (!complete.killed) complete.kill('SIGTERM');
      if (!failed.killed) failed.kill('SIGTERM');
      resolve(result);
    };

    const maybeTimeout = () => {
      if (settled) return;
      if (completeCode !== null && failedCode !== null) {
        settled = true;
        reject(new Error(`Timed out waiting for job/${jobName} (timeout=${timeout})`));
      }
    };

    complete.on('error', err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    failed.on('error', err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    complete.on('close', code => {
      completeCode = code ?? 1;
      if (completeCode === 0) settle('complete');
      else maybeTimeout();
    });
    failed.on('close', code => {
      failedCode = code ?? 1;
      if (failedCode === 0) settle('failed');
      else maybeTimeout();
    });
  });
}

export async function runJob(opts: RunJobOptions): Promise<void> {
  const namespace = opts.namespace ?? DEFAULT_NAMESPACE;
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT;

  if (!opts.rhdhUrl) {
    throw new Error('RHDH_URL is required');
  }
  if (!Number.isFinite(opts.loops) || opts.loops < 1) {
    throw new Error(`LOOPS must be a positive number, got: ${opts.loops}`);
  }

  await ensureNamespace(namespace);

  const yaml = buildJobYaml({
    rhdhUrl: opts.rhdhUrl,
    loops: opts.loops,
    networkThrottling: opts.networkThrottling,
    image: opts.image,
  });

  console.error(`Creating Job in namespace ${namespace}...`);
  const jobName = await createJob(namespace, yaml);
  console.error(`Job: ${jobName}`);

  console.error('Waiting for pod to become loggable...');
  const podName = await waitForJobPodLoggable(namespace, jobName, timeout);
  console.error(`Pod: ${podName}`);
  if (opts.logFile) {
    console.error(`Streaming logs to stdout and ${opts.logFile}`);
  } else {
    console.error('Streaming logs...');
  }

  const logs = streamPodLogs({
    namespace,
    podName,
    timeout,
    logFile: opts.logFile,
  });

  let outcome: 'complete' | 'failed';
  try {
    outcome = await waitForJob(namespace, jobName, timeout);
    // Let kubectl logs -f drain after the container exits before we kill it.
    await Promise.race([logs.done, sleep(10_000)]);
  } finally {
    logs.stop();
    await logs.done.catch(() => undefined);
  }

  // Always rewrite the log file from a full snapshot so ContainerCreating races
  // or a truncated follow cannot leave a partial file.
  if (opts.logFile) {
    mkdirSync(dirname(opts.logFile), { recursive: true });
    writeFileSync(opts.logFile, await fetchJobLogs(namespace, jobName));
    console.error(`Saved full pod log to ${opts.logFile}`);
  }

  if (outcome === 'failed') {
    throw new Error(`Job ${jobName} failed`);
  }
  console.error(`Job ${jobName} completed`);
}
