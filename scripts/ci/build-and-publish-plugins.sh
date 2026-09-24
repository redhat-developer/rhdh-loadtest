#!/bin/bash

# This script builds and publishes container images for a range of plugin
# instances. It is called by the "Build and Publish plugins" GitHub workflow
# (.github/workflows/build-and-publish-plugins.yaml) and must be executed
# from the repository root.
#
# Required environment variables:
#   WORKSPACE      Plugin workspace to build, e.g. "backstage-1.42"
#   START          First plugin instance number (1-100)
#   END            Last plugin instance number (1-100)
#   QUAY_USERNAME  Quay.io username (or robot account) used to push images
#   QUAY_PASSWORD  Quay.io password (or robot token)
#
# Optional environment variables:
#   IMAGE_REPOSITORY  Remote image repository,
#                     defaults to quay.io/rhdh-community/rhdh-loadtest-plugins

set -euo pipefail

for requiredEnv in WORKSPACE START END QUAY_USERNAME QUAY_PASSWORD; do
  if [ -z "${!requiredEnv:-}" ]; then
    echo "Missing required environment variable: $requiredEnv"
    exit 1
  fi
done

imageRepository="${IMAGE_REPOSITORY:-quay.io/rhdh-community/rhdh-loadtest-plugins}"
localImage="localhost/rhdh-loadtest-plugins"

workspace="plugins/${WORKSPACE:-undefined}"
version="${WORKSPACE#backstage-}"

if [ ! -d "$workspace" ]; then
  echo "Unknown workspace: $workspace"
  exit 1
fi

build_container_image() {
  local plugin="$1"
  local tag="$2"

  cd "$workspace/plugins/$plugin"
  rm -rf dist dist-dynamic dist-scalprum

  case "$version" in
    1.42)
      npx --yes @janus-idp/cli@3.6.1 package package-dynamic-plugins --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.45)
      npx --yes @red-hat-developer-hub/cli@1.9.1 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.49)
      npx --yes @red-hat-developer-hub/cli@1.10.7 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.52)
      npx --yes @red-hat-developer-hub/cli@1.11.1 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.54)
      npx --yes @red-hat-developer-hub/cli@2.1.1 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    *)
      echo "Unknown workspace version: $version"
      exit 1
      ;;
  esac
}

build_and_publish_instance() {
  local suffix="$1"

  echo
  echo "Building plugin instance $suffix"
  echo

  ./scripts/prepare-source-code.sh "$workspace" "$suffix"

  for plugin in page catalog-tab; do
    local tag="bs_${version}_${plugin}-${suffix}"

    (build_container_image "$plugin-n" "$tag")

    echo "Pushing $localImage:$tag to $imageRepository:$tag"
    podman push "$localImage:$tag" "$imageRepository:$tag"

    # Remove the local image to not run out of disk space on the CI runner.
    podman rmi "$localImage:$tag"
  done
}

echo "$QUAY_PASSWORD" | podman login --username "$QUAY_USERNAME" --password-stdin quay.io

for i in $(seq "$START" "$END"); do
  build_and_publish_instance "$i"
done

# Restore the "-n" code so that the working tree is clean again.
./scripts/prepare-source-code.sh "$workspace" "n"

podman logout quay.io
