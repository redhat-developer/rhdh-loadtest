import { readFileSync } from 'node:fs';

import {
  assertNetworkThrottling,
  buildLogFilePath,
  DEFAULT_NAMESPACE,
  DEFAULT_TIMEOUT,
  runJob,
  type NetworkThrottling,
} from './k8s-job.mts';

type BatchUrl = {
  name: string;
  url: string;
};

type BatchConfig = {
  loops: number;
  networkThrottling: NetworkThrottling;
  urls: BatchUrl[];
  prefix?: string;
  suffix?: string;
  namespace?: string;
  timeout?: string;
  logDir?: string;
  image?: string;
};

function usage(): never {
  console.error(`Usage: node scripts/run-batch.mts <config.json> [options]

Config JSON:
  {
    "loops": 3,
    "networkThrottling": "none",
    "prefix": "pr-123",
    "suffix": "warm",
    "urls": [
      { "name": "baseline", "url": "https://rhdh.example.com" },
      { "name": "http2", "url": "https://rhdh-http2.example.com" }
    ]
  }

Options (override config):
  --prefix <prefix>           Log filename prefix
  --suffix <suffix>           Log filename suffix
  --namespace <ns>            Kubernetes namespace (default ${DEFAULT_NAMESPACE})
  --timeout <duration>        Job wait / log timeout (default ${DEFAULT_TIMEOUT})
  --log-dir <dir>             Directory for log files (default logs)
  --image <image>             Job container image
  -h, --help                  Show this help
`);
  process.exit(2);
}

function readArg(args: string[], i: number, flag: string): string {
  const value = args[i + 1];
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

type CliOverrides = {
  configPath?: string;
  prefix?: string;
  suffix?: string;
  namespace?: string;
  timeout?: string;
  logDir?: string;
  image?: string;
};

function parseArgs(argv: string[]): CliOverrides {
  const opts: CliOverrides = {};
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        usage();
        break;
      case '--prefix':
        opts.prefix = readArg(args, i++, arg);
        break;
      case '--suffix':
        opts.suffix = readArg(args, i++, arg);
        break;
      case '--namespace':
        opts.namespace = readArg(args, i++, arg);
        break;
      case '--timeout':
        opts.timeout = readArg(args, i++, arg);
        break;
      case '--log-dir':
        opts.logDir = readArg(args, i++, arg);
        break;
      case '--image':
        opts.image = readArg(args, i++, arg);
        break;
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown argument: ${arg}`);
        }
        if (opts.configPath) {
          throw new Error(`Unexpected argument: ${arg}`);
        }
        opts.configPath = arg;
        break;
    }
  }

  return opts;
}

function loadConfig(path: string): BatchConfig {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;

  if (typeof raw.loops !== 'number' || !Number.isFinite(raw.loops) || raw.loops < 1) {
    throw new Error('Config "loops" must be a positive number');
  }
  if (typeof raw.networkThrottling !== 'string') {
    throw new Error('Config "networkThrottling" must be a string');
  }
  if (!Array.isArray(raw.urls) || raw.urls.length === 0) {
    throw new Error('Config "urls" must be a non-empty array');
  }

  const urls: BatchUrl[] = raw.urls.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`urls[${index}] must be an object with name and url`);
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.name !== 'string' || !item.name.trim()) {
      throw new Error(`urls[${index}].name must be a non-empty string`);
    }
    if (typeof item.url !== 'string' || !item.url.trim()) {
      throw new Error(`urls[${index}].url must be a non-empty string`);
    }
    return { name: item.name, url: item.url };
  });

  const optionalString = (key: string): string | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      throw new Error(`Config "${key}" must be a string`);
    }
    return value;
  };

  return {
    loops: raw.loops,
    networkThrottling: assertNetworkThrottling(raw.networkThrottling),
    urls,
    prefix: optionalString('prefix'),
    suffix: optionalString('suffix'),
    namespace: optionalString('namespace'),
    timeout: optionalString('timeout'),
    logDir: optionalString('logDir'),
    image: optionalString('image'),
  };
}

async function main() {
  const cli = parseArgs(process.argv);
  if (!cli.configPath) usage();

  const config = loadConfig(cli.configPath);
  const prefix = cli.prefix ?? config.prefix;
  const suffix = cli.suffix ?? config.suffix;
  const namespace = cli.namespace ?? config.namespace;
  const timeout = cli.timeout ?? config.timeout;
  const logDir = cli.logDir ?? config.logDir;
  const image = cli.image ?? config.image;

  console.error(`Batch: ${config.urls.length} URL(s), loops=${config.loops}, throttling=${config.networkThrottling}`);

  for (const [index, entry] of config.urls.entries()) {
    const logFile = buildLogFilePath({
      name: entry.name,
      prefix,
      suffix,
      logDir,
    });

    console.error(`\n=== [${index + 1}/${config.urls.length}] ${entry.name} -> ${entry.url}`);
    console.error(`Log file: ${logFile}`);

    await runJob({
      rhdhUrl: entry.url,
      loops: config.loops,
      networkThrottling: config.networkThrottling,
      namespace,
      timeout,
      image,
      logFile,
    });
  }

  console.error('\nBatch finished');
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
