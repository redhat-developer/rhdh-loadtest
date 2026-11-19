import {
  assertNetworkThrottling,
  buildLogFilePath,
  DEFAULT_NAMESPACE,
  DEFAULT_TIMEOUT,
  runJob,
  type NetworkThrottling,
} from './k8s-job.mts';

function usage(): never {
  console.error(`Usage: node scripts/run-job.mts [options]

Options:
  --url <url>                 RHDH base URL (or RHDH_URL env)
  --loops <n>                 Measured iterations (or LOOPS env, default 1)
  --network-throttling <v>    none|fast|medium|slow (or NETWORK_THROTTLING, default none)
  --namespace <ns>            Kubernetes namespace (default ${DEFAULT_NAMESPACE})
  --timeout <duration>        Job wait / log timeout (default ${DEFAULT_TIMEOUT})
  --name <name>               Log base name (enables writing a log file)
  --prefix <prefix>           Optional log filename prefix
  --suffix <suffix>           Optional log filename suffix
  --log-file <path>           Explicit log path (overrides --name/--prefix/--suffix)
  --log-dir <dir>             Directory for derived log files (default logs)
  --image <image>             Job container image
  -h, --help                  Show this help

Environment: RHDH_URL, LOOPS, NETWORK_THROTTLING
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

type CliOptions = {
  url?: string;
  loops?: number;
  networkThrottling?: NetworkThrottling;
  namespace?: string;
  timeout?: string;
  name?: string;
  prefix?: string;
  suffix?: string;
  logFile?: string;
  logDir?: string;
  image?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {};
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--help':
        usage();
        break;
      case '--url':
        opts.url = readArg(args, i++, arg);
        break;
      case '--loops':
        opts.loops = Number(readArg(args, i++, arg));
        break;
      case '--network-throttling':
        opts.networkThrottling = assertNetworkThrottling(readArg(args, i++, arg));
        break;
      case '--namespace':
        opts.namespace = readArg(args, i++, arg);
        break;
      case '--timeout':
        opts.timeout = readArg(args, i++, arg);
        break;
      case '--name':
        opts.name = readArg(args, i++, arg);
        break;
      case '--prefix':
        opts.prefix = readArg(args, i++, arg);
        break;
      case '--suffix':
        opts.suffix = readArg(args, i++, arg);
        break;
      case '--log-file':
        opts.logFile = readArg(args, i++, arg);
        break;
      case '--log-dir':
        opts.logDir = readArg(args, i++, arg);
        break;
      case '--image':
        opts.image = readArg(args, i++, arg);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

async function main() {
  const cli = parseArgs(process.argv);

  const rhdhUrl = cli.url ?? process.env.RHDH_URL ?? '';
  const loops = cli.loops ?? Number(process.env.LOOPS || 1);
  const networkThrottling = assertNetworkThrottling(
    cli.networkThrottling ?? process.env.NETWORK_THROTTLING ?? 'none',
  );

  let logFile = cli.logFile;
  if (!logFile && cli.name) {
    logFile = buildLogFilePath({
      name: cli.name,
      prefix: cli.prefix,
      suffix: cli.suffix,
      logDir: cli.logDir,
    });
  }

  await runJob({
    rhdhUrl,
    loops,
    networkThrottling,
    namespace: cli.namespace,
    timeout: cli.timeout,
    image: cli.image,
    logFile,
  });
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
