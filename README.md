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
oc apply -f argocd/app-of-current-apps.yaml
oc apply -f argocd/app-of-next-apps.yaml
oc apply -f argocd/app-of-legacy-apps.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-of-current-apps.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-of-next-apps.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-of-legacy-apps.yaml
```

Or create just a single application:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/next-apps/rhdh-next.yaml
oc apply -f argocd/next-apps/rhdh-next-http2.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/next-apps/rhdh-next.yaml
oc apply -f https://raw.githubusercontent.com/redhat-developer/rhdh-loadtest/refs/heads/main/argocd/next-apps/rhdh-next-http2.yaml
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

## Dynamic test-plugins (as container images)

The `workspaces` folder contains multiple Backstage workspaces for different
RHDH and so for different Backstage versions.

Each workspace contains at least two plugins: One that adds a new page to the main navigation and one that adds a new tab to the catalog details page.

The latest version includes also some more test plugins to compare Backstage UI (BUI) vs. Material UI (4) / MUI (5), etc.

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

### Dyanmic Plugin Configuration with mount point configuration

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

The `load-generator` folder contains a Playwright-based load generator that simulates user interactions with RHDH.

It is not a replacement for dedicated performance testing — the goal is to produce reproducible, lightweight load tests that can run on smaller test environments.

Full command reference: [load-generator/README.md](load-generator/README.md).  

### Scenarios

Point `RHDH_URL` at whichever RHDH instance you want to measure (any chart / version that exposes the guest journey).

The tests runs n times (`export LOOPS=5`, default is 10) of the same user journey, which means login, homepage, catalog, etc.

Each run walks through the complete app two times, onces without any cached JS (the default Playwright behaviour for a test).
Then it sign outs the user and navigates to the login (`goto("/")`) again and opens all pages a second time.

The analyses script builds an average (plus p90, min, max) based on all runs to get a more 'stable' number.
In the reporting we call this "cold" (no cached JS) and "warm" (cached JS from the first visit).

Because your local connection to the cluster is still a thing, there is also a script to run the tests on the cluster.
Since the speed network within the cluster would be 'too fast' these should use the available threshold configuration.

### Run locally

```shell
cd load-generator
yarn install
yarn install-browser
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

export RHDH_URL=https://<route-host>
export NETWORK_THROTTLING=none
export PLAYWRIGHT_TEST_TIMEOUT=3600000
export PLAYWRIGHT_EXPECT_TIMEOUT=60000
export PLAYWRIGHT_NAVIGATION_TIMEOUT=60000
export LOOPS=3

yarn test
yarn analyse
```

Resolve a route host:

```shell
oc get route -n <namespace> -o jsonpath='{.items[0].spec.host}{"\n"}'
```

### Run as a container

```shell
cd load-generator
podman build . --tag load-generator
podman run -e RHDH_URL=https://your-rhdh-instance.example.com -e LOOPS=10 load-generator
```

### Configuration

| Environment variable | Description |
|---|---|
| `RHDH_URL` | Base URL of the RHDH instance to test |
| `LOOPS` | Measured iterations (default `1`). Warm also runs 1 extra prime pass |
| `NETWORK_THROTTLING` | `none` (default), `fast`, `medium`, `slow` |
| `PLAYWRIGHT_TEST_TIMEOUT` | Overall test timeout (ms); high value for warm LOOPS=20 |
| `PLAYWRIGHT_EXPECT_TIMEOUT` | Expect timeout (ms); `60000` recommended on slow clusters |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT` | Navigation timeout (ms) |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | JSON path for `yarn analyse` |
