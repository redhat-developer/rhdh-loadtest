# [RHDH](https://developers.redhat.com/rhdh) loadtest container images and tooling

This repository contains ArgoCD resources, Helm charts and other resources
to setup different RHDH versions on Kubernetes with up to 200 dynamic (frontend) plugins
and 50k catalog entities.

Available versions: `rhdh-18`, `rhdh-19`, `rhdh-110`, `rhdh-110-nfs`, and `rhdh-next`

## Create test instances with Helm

To create 1.10, 1.10 NFS and Next:

```
make install-all
```

To create 1.8 and 1.9:

```
make install-legacy
```

Or for just one version use:

```
cd helm/rhdh-next && make install 
```

## Create test instances with Argo CD

Start an OpenShift cluster with OpenShift GitOps operator. To create all test apps (currently 4) run:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/app-of-default-apps.yaml   # for 1.10 and newer
oc apply -f argocd/app-of-legacy-apps.yaml    # for 1.8 and 1.9
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-of-default-apps.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-of-legacy-apps.yaml
```

Or create just a single application:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/default-apps/rhdh-110-nfs.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/default-apps/rhdh-110-nfs.yaml
```

## Test catalog entities

Add and adjust the following catalog snippet into your `app-config.yaml`.

Import 10, 100, 1000 or 10000 `components`, `groups`, `systems`, `apis` and `templates` entities as shown below:

```yaml
upstream:
  backstage:
    appConfig:
      catalog:
        locations:
          - type: url
            target: https://github.com/redhat-developer/rhdh-loadtest/blob/main/catalog/components-1000.yaml
            rules:
              - allow: [Component]
          - type: url
            target: https://github.com/redhat-developer/rhdh-loadtest/blob/main/catalog/groups-100.yaml
            rules:
              - allow: [Group]
          - type: url
            target: https://github.com/redhat-developer/rhdh-loadtest/blob/main/catalog/systems-100.yaml
            rules:
              - allow: [System]
          - type: url
            target: https://github.com/redhat-developer/rhdh-loadtest/blob/main/catalog/apis-100.yaml
            rules:
              - allow: [API]
          - type: url
            target: https://github.com/redhat-developer/rhdh-loadtest/blob/main/catalog/templates-100.yaml
            rules:
              - allow: [Template]
```

## RBAC

TODO

## Test Plugins

The `plugins` folder contains multiple Backstage workspaces for different Backstage versions (1.42, 1.45, 1.49 and 1.54).
Each workspace contains currently two plugins.
One that adds a new page to the main navigation and one that adds a new tab to the catalog details page.

The scripts folder contains scripts to build these plugins 100 times with indepenend `pluginIds` to integrate these plugins multiple times into RHDH.

They are published as one container image under [quay.io/rhdh-community/rhdh-loadtest-plugins](https://quay.io/repository/rhdh-community/rhdh-loadtest-plugins?tab=tags) with a tag for each combinaton. For example:

* `quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.42_page-n`
* `quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.42_catalog-tab-n`

### Dynamic Plugin Configuration for the New Frontend System

```yaml
redhat-developer-hub:
  dynamicPlugins:
    plugins:
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.54_page-1!internal-backstage-plugin-page-1
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.54_page-2!internal-backstage-plugin-page-...

      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.54_catalog-tab-1!internal-backstage-plugin-catalog-tab-1
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.54_catalog-tab-2!internal-backstage-plugin-catalog-tab-...
```

### Dyanmic Plugin Confogiration with mount point configuration

The Backstage version can be replaced with `bs_1.42`, `bs_1.45`, `bs_1.49` or `bs_1.54` and the `-n` can be replaced with a 1 to 100 so that up to 200 dynamic (frontend) plugins can be loaded for each RHDH release.

To integrate these into your local setup apply these RHDH dynamic plugin configurations:

**For n Page plugins**

```yaml
global:
  dynamic:
    plugins:
      #                                                replace this ↓↓      ↓                      ↓
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.42_page-n!internal-plugin-page-n
        disabled: false
        pluginConfig:
          dynamicPlugins:
            frontend:
              #           and this ↓
              internal.plugin-page-n:
                dynamicRoutes:
                  #    and this ↓
                  - path: /page-n
                    importName: Page
                    menuItem:
                      icon: dashboard
                      # and this ↓
                      text: Page N
```

You can pick up a complete example in [helm/rhdh-18/values.yaml](helm/rhdh-18/values.yaml).

**For n Entity Tabs plugins**

```yaml
global:
  dynamic:
    plugins:
      #                                                replace this ↓↓             ↓                             ↓
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:bs_1.42_catalog-tab-n!internal-plugin-catalog-tab-n
        disabled: false
        pluginConfig:
          dynamicPlugins:
            frontend:
              #                  and this ↓
              internal.plugin-catalog-tab-n:
                entityTabs:
                  #           and this ↓
                  - path: /catalog-tab-n
                    #         and this ↓
                    title: Catalog Tab N
                    #                          and this ↓
                    mountPoint: entity.page.catalog-tab-n
                mountPoints:
                  #                            and this ↓
                  - mountPoint: entity.page.catalog-tab-n/cards
                    importName: EntityCatalogCard
```

You can pick up a complete example in [helm/rhdh-18/values.yaml](helm/rhdh-18/values.yaml).

## Load Generator

The `load-generator` directory contains a Playwright-based load generator that simulates user interactions with RHDH.

It is not a replacement for dedicated performance testing — the goal is to produce reproducible, lightweight load tests that can run on smaller test environments.

Full command reference: [load-generator/README.md](load-generator/README.md).  
### Scenarios

| Frontend | Spec | Script |
|---|---|---|
| **OFS** (classic) | `guest-login-home-catalog.spec.ts` | `yarn test` |
| **NFS** (new FE) | `guest-login-home-catalog-nfs.spec.ts` | `yarn test:nfs` |

Point `RHDH_URL` at whichever RHDH instance you want to measure (any chart / version that exposes the guest journey).

### Journey

Each measured loop is one user session. Step names in reports are `cold/<step>` or `warm/<step>`:

| # | Step | Start | Success criteria |
|---|---|---|---|
| 1 | **login** | `GET /` | Guest **Enter** visible (cold), or already-authenticated home (warm repeat) |
| 2 | **home** | Click **Enter** (if shown), then sidebar **Home** | Home ready (widgets / welcome / empty-home, depending on build) |
| 3 | **catalog** | Sidebar **Catalog** | **Catalog**, **All Components (1000)**, **Component 1** |
| 4 | **component** | Click **Component 1** | **About**, **Group 1**, **System 1**, **Catalog Tab 1** |
| 5 | **catalog-tab-n** | Click **Catalog Tab 1** | **Example User List** |
| 6 | **page-n** | Sidebar **Page 1** | **Welcome to Page 1!**, **Information card**, **Example User List** |

### Cold vs warm

- **Cold:** new browser context per loop; HTTP cache disabled and cleared.
- **Warm:** one browser context; one unmeasured **prime** journey, then measured loops with cache enabled.
- **Journey time** = sum of the six steps. Do **not** compare warm Playwright `all` (prime + N loops) to cold `all`.

### Run locally

```shell
cd load-generator
yarn install
yarn install-browser
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

export RHDH_URL=https://<route-host>
export RHDH_FRONTEND=ofs   # or nfs
export NETWORK_THROTTLING=none
export PLAYWRIGHT_TEST_TIMEOUT=3600000
export PLAYWRIGHT_EXPECT_TIMEOUT=60000
export PLAYWRIGHT_NAVIGATION_TIMEOUT=60000

CACHE_MODE=cold LOOPS=5 yarn test          # use yarn test:nfs when RHDH_FRONTEND=nfs
cp -f test-results.json test-results-cold.json
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results-cold.json yarn analyse

CACHE_MODE=warm LOOPS=20 yarn test
cp -f test-results.json test-results-warm.json
PLAYWRIGHT_JSON_OUTPUT_FILE=test-results-warm.json yarn analyse
```

Resolve a route host:

```shell
oc get route -n <namespace> -o jsonpath='{.items[0].spec.host}{"\n"}'
```

### Run as a container

```shell
cd load-generator
podman build . --tag load-generator
podman run -e RHDH_URL=https://your-rhdh-instance.example.com \
  -e RHDH_FRONTEND=ofs -e CACHE_MODE=cold -e LOOPS=5 load-generator
```

### Configuration

| Environment variable | Description |
|---|---|
| `RHDH_URL` (or `PLAYWRIGHT_BASEURL`) | Base URL of the RHDH instance to test |
| `RHDH_FRONTEND` | `ofs` (default) or `nfs` — selects which Playwright spec runs |
| `CACHE_MODE` | `cold`, `warm`, or `both` (default `both`) |
| `LOOPS` | Measured iterations (default `1`). Warm also runs 1 extra prime pass |
| `NETWORK_THROTTLING` | `none` (default), `fast`, `medium`, `slow` |
| `PLAYWRIGHT_TEST_TIMEOUT` | Overall test timeout (ms); high value for warm LOOPS=20 |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | Expect timeout (ms); `60000` recommended on slow clusters |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT` | Navigation timeout (ms) |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | JSON path for `yarn analyse` |
