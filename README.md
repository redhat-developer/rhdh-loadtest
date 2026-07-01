# [RHDH](https://developers.redhat.com/rhdh) lightweight loadtest tools

This repository contains ArgoCD resources, Helm charts and other resources
to setup different RHDH versions on Kubernetes with up to 200 dynamic (frontend) plugins
and 50k catalog entities.

Available versions: `rhdh-17`, `rhdh-18`, `rhdh-19`, `rhdh-110`, `rhdh-110-nfs`, and `rhdh-next`

## Create test instances with Helm

To create 1.9 and above:

```
make install-all
```

or for 1.7 up to 1.8:

```
make install-legacy
```

or for just one version use:

```
cd helm/rhdh-110 && make install 
```

## Create test instances with Argo CD

Start an OpenShift cluster with OpenShift GitOps operator. To create all test apps (currently 4) run:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/app-of-default-apps.yaml   # for 1.9 and newer
oc apply -f argocd/app-of-legacy-apps.yaml    # for 1.7 and 1.8
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-of-default-apps.yaml
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-of-legacy-apps.yaml
```

Or create just a single application:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/default-apps/rhdh-110-nfs.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/default-apps/rhdh-110-nfs.yaml
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

## Dynamic Plugins (Example container images for different RHDH versions)

The `plugins` folder contains multiple Backstage workspaces for different Backstage versions (1.42, 1.45, 1.49 and 1.52).
Each workspace contains currently two plugins.
One that adds a new page to the main navigation and one that adds a new tab to the catalog details page.

The scripts folder contains scripts to build these plugins 100 times with indepenend `pluginIds` to integrate these plugins multiple times into RHDH.

They are published as one container image under [quay.io/jerolimov/rhdh-loadtest-plugins](https://quay.io/repository/jerolimov/rhdh-loadtest-plugins?tab=tags) with a tag for each combinaton. For example:

* `quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_page-n`
* `quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_catalog-tab-n`

The Backstage version can be replaced with `bs_1.42`, `bs_1.45`, `bs_1.49` or `bs_1.52` and the `-n` can be replaced with a 1 to 100 so that up to 200 dynamic (frontend) plugins can be loaded for each RHDH release.

To integrate these into your local setup apply these RHDH dynamic plugin configurations:

**For n Page plugins**

```yaml
global:
  dynamic:
    plugins:
      #                                                replace this ↓↓      ↓                      ↓
      - package: oci://quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_page-n!internal-plugin-page-n
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
      - package: oci://quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_catalog-tab-n!internal-plugin-catalog-tab-n
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

The test scenario (`guest-login-home-catalog.spec.ts`) runs a configurable number of loops (default: 100), each performing these steps:

1. **Login** — Opens the RHDH instance and waits for the guest "Enter" button
2. **Home** — Clicks "Enter" and verifies the home page loads (Welcome, Get started, Explore cards)
3. **Catalog** — Navigates to the Catalog page and verifies all 1000 components are listed
4. **Component** — Opens "Component 1" and verifies its details (About, Group 1, System 1, Catalog Tab 1)
5. **Catalog Tab** — Clicks the "Catalog Tab 1" tab and verifies the plugin content loads
6. **Page Plugin** — Navigates to "Page 1" via the sidebar and verifies the plugin page loads

After the test completes, an analysis script (`scripts/analyse.mts`) parses the Playwright JSON report and prints per-step statistics (count, avg, p95, min, max).

Example output:

```
Step                      Count        Avg        P95        Min        Max
---------------------------------------------------------------------------
login                       100     6661ms     7387ms     6194ms     8564ms
home                        100     1419ms     1905ms     1087ms     1997ms
catalog                     100     1361ms     1454ms     1011ms     1861ms
component                   100      689ms      776ms      543ms     1214ms
catalog-tab-n               100      982ms     1071ms      425ms     2054ms
page-n                      100      982ms     1424ms      881ms     1916ms
all                         100    12126ms    13590ms    10686ms    14515ms
```

### Run locally

```shell
cd load-generator
npm install
npm run install-browser
export RHDH_URL=https://your-rhdh-instance.example.com
npm test
```

### Run as a container

```shell
cd load-generator
podman build . --tag load-generator
podman run -e RHDH_URL=https://your-rhdh-instance.example.com load-generator
```

### Configuration

| Environment variable | Description |
|---|---|
| `RHDH_URL` (or `PLAYWRIGHT_BASEURL`) | Base URL of the RHDH instance to test |
