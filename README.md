# Some [RHDH](https://developers.redhat.com/rhdh) loadtest experiments 🧪

## Create instances with Helm

To create all test instances at once (`rhdh-17`, `rhdh-18`, `rhdh-19`, `rhdh-110`, and `rhdh-next`) run

```
make install-all
```

or for just one version use:

```
cd helm/rhdh-110 && make install 
```

## Create instances with Argo CD

Start an OpenShift cluster with OpenShift GitOps operator.

To create all test apps (currently 4) run:

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/app-of-apps.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-of-apps.yaml
```

Or apply just a single application (current available: `rhdh-17`, `rhdh-18`, `rhdh-19`, `rhdh-110`, and `rhdh-next`):

```bash
oc apply -f argocd/app-project.yaml
oc apply -f argocd/app-of-apps/rhdh-19.yaml
```

or, without cloning:

```bash
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-project.yaml
oc apply -f https://raw.githubusercontent.com/christoph-jerolimov/rhdh-loadtests/refs/heads/main/argocd/app-of-apps/rhdh-19.yaml
```

## Catalog entities

Add and adjust the following catalog snippet into your `app-config.yaml`.

Import 10, 100, 1000 or 10000 `components`, `groups`, `systems`, `apis` and `templates` entities as shown below:

```yaml
upstream:
  backstage:
    appConfig:
      catalog:
        locations:
          - type: url
            target: https://github.com/christoph-jerolimov/rhdh-loadtests/blob/main/catalog/components-1000.yaml
            rules:
              - allow: [Component]
          - type: url
            target: https://github.com/christoph-jerolimov/rhdh-loadtests/blob/main/catalog/groups-100.yaml
            rules:
              - allow: [Group]
          - type: url
            target: https://github.com/christoph-jerolimov/rhdh-loadtests/blob/main/catalog/systems-100.yaml
            rules:
              - allow: [System]
          - type: url
            target: https://github.com/christoph-jerolimov/rhdh-loadtests/blob/main/catalog/apis-100.yaml
            rules:
              - allow: [API]
          - type: url
            target: https://github.com/christoph-jerolimov/rhdh-loadtests/blob/main/catalog/templates-100.yaml
            rules:
              - allow: [Template]
```

## Plugins

The `plugins` folder contains multiple Backstage workspaces for different Backstage versions (1.42, 1.45 and 1.48).
Each workspace contains currently two plugins.
One that adds a new page to the main navigation and one that adds a new tab to the catalog details page.

The script **TODO/WIP** build these plugin 100 times with indepenend `pluginIds` to integrate these plugins multiple times into RHDH.

They are published as one container image under [quay.io/jerolimov/rhdh-loadtest-plugins](https://quay.io/repository/jerolimov/rhdh-loadtest-plugins?tab=tags) with a tag for each combinaton. For example:

* `quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_page-n`
* `quay.io/jerolimov/rhdh-loadtest-plugins:bs_1.42_catalog-tab-n`

The Backstage version can be replaced with `bs_1.42`, `bs_1.45` or `bs_1.45`.

**TODO/WIP**: The `-n` can be replaced with a 1 to 100.

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

## RBAC

TODO
