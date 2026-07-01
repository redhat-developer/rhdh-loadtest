#!/bin/bash

# This script builds hunderts of container images!
# For each Backstage workspace it builds both plugins 100 times.
# Currently, 4 * 2 * 101 = 808 container images will be built!

set -e

prepare_source_code() {
  local workspace="$1"
  local suffix="$2"
  # Will be executed below from the ROOT level.
  echo
  ./scripts/prepare-source-code.sh "$workspace" "$suffix"
}

build_container_images() {
  local workspace="$1"
  local suffix="$2"
  
  case "$workspace" in
    *1.42*)
      echo
      echo "Build plugins with suffix $suffix for Backstage 1.42 with @janus-idp/cli@3.6.1"
      echo
      cd "$workspace"
      cd plugins/page-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @janus-idp/cli@3.6.1 package package-dynamic-plugins --tag "rhdh-loadtest-plugins:bs_1.42_page-$suffix"
      cd ../..
      cd plugins/catalog-tab-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @janus-idp/cli@3.6.1 package package-dynamic-plugins --tag "rhdh-loadtest-plugins:bs_1.42_catalog-tab-$suffix"
      cd ../..
      cd ../..

      ;;
    *1.45*)
      echo
      echo "Build plugins with suffix $suffix for Backstage 1.45 plugins with @red-hat-developer-hub/cli@1.9.1"
      echo
      cd "$workspace"
      cd plugins/page-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.9.1 plugin package --tag "rhdh-loadtest-plugins:bs_1.45_page-$suffix"
      cd ../..
      cd plugins/catalog-tab-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.9.1 plugin package --tag "rhdh-loadtest-plugins:bs_1.45_catalog-tab-$suffix"
      cd ../..
      cd ../..

      ;;
    *1.49*)
      echo
      echo "Build plugins with suffix $suffix for Backstage 1.49 plugins with @red-hat-developer-hub/cli@1.10.7"
      echo
      cd "$workspace"
      cd plugins/page-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.10.7 plugin package --tag "rhdh-loadtest-plugins:bs_1.49_page-$suffix"
      cd ../..
      cd plugins/catalog-tab-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.10.7 plugin package --tag "rhdh-loadtest-plugins:bs_1.49_catalog-tab-$suffix"
      cd ../..
      cd ../..

      ;;
    *1.52*)
      echo
      echo "Build plugins with suffix $suffix for Backstage 1.52 plugins with @red-hat-developer-hub/cli@1.11.1"
      echo
      cd "$workspace"
      cd plugins/page-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.11.1 plugin package --tag "rhdh-loadtest-plugins:bs_1.52_page-$suffix"
      cd ../..
      cd plugins/catalog-tab-n
      rm -rf dist dist-dynamic dist-scalprum
      npx --yes @red-hat-developer-hub/cli@1.11.1 plugin package --tag "rhdh-loadtest-plugins:bs_1.52_catalog-tab-$suffix"
      cd ../..
      cd ../..

      ;;
    *)
      echo "Unknown workspace version for $workspace"
      ;;
  esac
}

for workspace in plugins/backstage-1.42 plugins/backstage-1.45 plugins/backstage-1.49 plugins/backstage-1.52; do
  if [ ! -d "$workspace" ]; then
    continue
  fi

  echo
  echo "Will build workspace: $workspace"
  echo

  if [ ! -d "$workspace/node_modules" ]; then
    echo "Installing node_modules for workspace $workspace"
    cd "$workspace"
    yarn install
    cd ../..
  fi

  prepare_source_code "$workspace" "n"
  build_container_images "$workspace" "n"

  # I kept number small for testing purposes.
  # In the end, we should build 100 images per plugin and workspace.
  for i in {1..3}; do
    prepare_source_code "$workspace" "$i"
    build_container_images "$workspace" "$i"
  done

  # Use parepare to restore "-n" code again so that there should be no git diff...
  prepare_source_code "$workspace" "n"
  echo
done
