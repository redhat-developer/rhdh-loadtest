# Load generator (Playwright guest journey)

A Playwright test to reproduce load tests on RHDH. This is not a replacement for Red Hat Perf team runs but it helps our RHDH team to run similar tests on different environments.

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

Point `RHDH_URL` at any RHDH instance that exposes the guest journey (any chart / version).

```shell
oc get route -n <namespace> -o jsonpath='{.items[0].spec.host}{"\n"}'
# then: export RHDH_URL=https://<host>
yarn test
```

## Commands

### Run locally

```shell
cd load-generator
export RHDH_URL='https://<route-host>'
export NETWORK_THROTTLING=none
export LOOPS=3

yarn test
yarn analyse
```

### Run as a container

```shell
cd load-generator
podman build . --tag load-generator
podman run -e RHDH_URL=https://your-rhdh-instance.example.com -e LOOPS=10 load-generator
```

## Configuration

| Environment variable | Description |
| -------------------- | ----------- |
| `RHDH_URL` | Base URL of the RHDH instance |
| `CACHE_MODE` | `cold`, `warm`, or `both` (default `both`) |
| `LOOPS` | Measured iterations (default `1`). Warm also runs 1 prime pass |
| `NETWORK_THROTTLING` | `none` (default), `fast`, `medium`, `slow` |
| `PLAYWRIGHT_TEST_TIMEOUT` | Overall test timeout (ms); use a high value for warm LOOPS=20 |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | Expect timeout (ms); `60000` recommended on slow clusters |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT` | Navigation timeout (ms) |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | JSON results path for `yarn analyse` |
