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

# The packaging CLIs redirect child-process output (notably `yarn install`) into
# log files instead of the console. @janus-idp/cli never dumps that file on
# failure; @red-hat-developer-hub/cli does for yarn-install but other steps can
# still leave diagnostics on disk. Dump known log files when a command fails so
# GitHub Actions captures the real error, then re-raise the original exit code.
dump_cli_failure_logs() {
  local found=0
  local f

  echo
  echo "===== Packaging CLI failure logs ====="

  for f in \
    "${TMPDIR:-/tmp}/rhdh-cli.yarn-install.log" \
    "yarn-install.log" \
    "dist-dynamic/yarn-install.log"; do
    if [ -f "$f" ]; then
      found=1
      echo
      echo "----- $f -----"
      cat "$f"
    fi
  done

  # npm pack / tar staging logs and npm's own debug logs (best-effort).
  while IFS= read -r f; do
    found=1
    echo
    echo "----- $f -----"
    cat "$f"
  done < <(
    {
      find "${TMPDIR:-/tmp}" -maxdepth 2 \( \
        -name 'rhdh-cli.yarn-install.log' -o \
        -name 'npm-pack-output-*.log' -o \
        -name 'yarn-install.log' \
      \) -type f 2>/dev/null
      # Prefer the newest npm debug logs; older runs can leave many files behind.
      find "${HOME}/.npm/_logs" -maxdepth 1 -name '*.log' -type f \
        -printf '%T@ %p\n' 2>/dev/null \
        | sort -nr \
        | head -n 5 \
        | cut -d' ' -f2-
    } | awk '!seen[$0]++'
  )

  if [ "$found" -eq 0 ]; then
    echo "(no CLI log files found under ${TMPDIR:-/tmp}, ${HOME}/.npm/_logs, or the plugin directory)"
  fi

  echo "===== End packaging CLI failure logs ====="
  echo
}

run_with_cli_failure_logs() {
  local exit_code=0
  "$@" || exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    dump_cli_failure_logs || true
  fi
  return "$exit_code"
}

build_container_image() {
  local plugin="$1"
  local tag="$2"

  cd "$workspace/plugins/$plugin"
  rm -rf dist dist-dynamic dist-scalprum

  case "$version" in
    1.42)
      run_with_cli_failure_logs npx --yes @janus-idp/cli@3.6.1 package package-dynamic-plugins --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.45)
      run_with_cli_failure_logs npx --yes @red-hat-developer-hub/cli@1.9.1 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.49)
      run_with_cli_failure_logs npx --yes @red-hat-developer-hub/cli@1.10.7 plugin package --tag "rhdh-loadtest-plugins:$tag"
      ;;
    1.54)
      run_with_cli_failure_logs npx --yes @red-hat-developer-hub/cli@2.1.1 plugin package --tag "rhdh-loadtest-plugins:$tag"
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

    # Quay tag expiration: h/d/w only; 730d ≈ 2 years from push
    printf 'FROM %s\nLABEL quay.expires-after=730d\n' "$localImage:$tag" \
      | podman build -t "$localImage:$tag" -

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
