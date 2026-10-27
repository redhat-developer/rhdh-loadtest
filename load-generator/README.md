# Load generator (Playwright guest journey)

Lightweight, reproducible Playwright load tests for RHDH. Not a replacement for Red Hat Perf team runs.


## Setup

```shell
cd load-generator
yarn install
yarn install-browser
```

If you hit proxy issues against an OpenShift route, unset proxies for the shell:

```shell
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy
```

## Targets

| Frontend | Spec | Script |
| -------- | ---- | ------ |
| **OFS** (classic) | `guest-login-home-catalog.spec.ts` | `yarn test` |
| **NFS** (new FE) | `guest-login-home-catalog-nfs.spec.ts` | `yarn test:nfs` |

Point `RHDH_URL` at any RHDH instance that exposes the guest journey (any chart / version).

```shell
oc get route -n <namespace> -o jsonpath='{.items[0].spec.host}{"\n"}'
# then: export RHDH_URL=https://<host>
```

## Journey steps

Each measured loop is one user session. Report step names are `cold/<step>` or `warm/<step>`:

| Step | What is timed |
| ---- | ------------- |
| **login** | `goto /` → guest Enter *or* home ready |
| **home** | Enter (if needed) → Home ready |
| **catalog** | Catalog → All Components (1000) + Component 1 |
| **component** | Component 1 → About / owner / system + Catalog Tab 1 |
| **catalog-tab-n** | Catalog Tab 1 → Example User List |
| **page-n** | Page 1 → welcome + cards |

**Journey time** = sum of the six steps. Ignore warm Playwright `all` (prime + N loops in one test).

## Cold vs warm

| Mode | Behavior |
| ---- | -------- |
| **Cold** | New browser context per loop; HTTP cache disabled and cleared |
| **Warm** | One context; 1 unscored **prime**, then `LOOPS` measured repeats with cache on |

## Commands

```shell
cd load-generator
export RHDH_URL='https://<route-host>'
export RHDH_FRONTEND=ofs   # or nfs → use yarn test:nfs below
export NETWORK_THROTTLING=none
export PLAYWRIGHT_TEST_TIMEOUT=3600000
export PLAYWRIGHT_EXPECT_TIMEOUT=60000
export PLAYWRIGHT_NAVIGATION_TIMEOUT=60000

CACHE_MODE=cold LOOPS=5 yarn test          # yarn test:nfs when RHDH_FRONTEND=nfs
cp -f test-results.json test-results-cold.json
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results-cold.json yarn analyse

CACHE_MODE=warm LOOPS=20 yarn test
cp -f test-results.json test-results-warm.json
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results-warm.json yarn analyse
```

## Analyse only

```shell
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results-cold.json yarn analyse
```

## Configuration

| Environment variable | Description |
| -------------------- | ----------- |
| `RHDH_URL` (or `PLAYWRIGHT_BASEURL`) | Base URL of the RHDH instance |
| `RHDH_FRONTEND` | `ofs` (default) or `nfs` — selects which Playwright spec runs |
| `CACHE_MODE` | `cold`, `warm`, or `both` (default `both`) |
| `LOOPS` | Measured iterations (default `1`). Warm also runs 1 prime pass |
| `NETWORK_THROTTLING` | `none` (default), `fast`, `medium`, `slow` |
| `PLAYWRIGHT_TEST_TIMEOUT` | Overall test timeout (ms); use a high value for warm LOOPS=20 |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | Expect timeout (ms); `60000` recommended on slow clusters |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT` | Navigation timeout (ms) |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | JSON results path for `yarn analyse` |

## Container

```shell
cd load-generator
podman build . --tag load-generator
podman run -e RHDH_URL=https://your-rhdh-instance.example.com \
  -e RHDH_FRONTEND=ofs -e CACHE_MODE=cold -e LOOPS=5 load-generator
```

## Deploy charts (quick)

From repo root / chart dirs:

```shell
make install-all
# or one chart:
cd helm/<chart> && make install
```
