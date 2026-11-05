#!/bin/bash

set -e

backstage_prefix="bs_1.54_"
pages=100
catalog_tabs=100

path_prefix="internal-backstage-plugin-"
yaml_prefix="internal.backstage-plugin-"

# Plugin name was slightliy different for Backstage 1.42.
if [ "$backstage_prefix" = "bs_1.42_" ]; then
  path_prefix="internal-plugin-"
  yaml_prefix="internal.plugin-"
fi

echo "global:"
echo "  dynamic:"
echo "    plugins:"
echo "      # other plugins..."

if [ "$backstage_prefix" = "bs_1.54_" ]; then
  for i in $(seq 1 $pages); do
    echo "      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:${backstage_prefix}page-$i!${path_prefix}page-$i"
  done
  echo
  for i in $(seq 1 $catalog_tabs); do
    echo "      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:${backstage_prefix}catalog-tab-$i!${path_prefix}catalog-tab-$i"
  done
  echo
else
  for i in $(seq 1 $pages); do
    cat <<EOF
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:${backstage_prefix}page-$i!${path_prefix}page-$i
        disabled: false
        pluginConfig:
          dynamicPlugins:
            frontend:
              ${yaml_prefix}page-$i:
                dynamicRoutes:
                  - path: /page-$i
                    importName: Page
                    menuItem:
                      icon: dashboard
                      text: Page $i
EOF
  done
  echo

  for i in $(seq 1 $catalog_tabs); do
    cat <<EOF
      - package: oci://quay.io/rhdh-community/rhdh-loadtest-plugins:${backstage_prefix}catalog-tab-$i!${path_prefix}catalog-tab-$i
        disabled: false
        pluginConfig:
          dynamicPlugins:
            frontend:
              ${yaml_prefix}catalog-tab-$i:
                entityTabs:
                  - path: /catalog-tab-$i
                    title: Catalog Tab $i
                    mountPoint: entity.page.catalog-tab-$i
                mountPoints:
                  - mountPoint: entity.page.catalog-tab-$i/cards
                    importName: EntityCatalogCard
EOF
  echo
  done
fi
