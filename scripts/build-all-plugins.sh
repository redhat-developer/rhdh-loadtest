#!/bin/bash

# This script builds all Backstage plugins primarily to validate them.

set -e

for workspace in workspaces/backstage-*; do
  if [ ! -d "$workspace" ]; then
    continue
  fi
  echo "Build $workspace"
  cd "$workspace"

  if [ ! -d node_modules ]; then
    yarn install
  fi

  yarn tsc
  yarn build:all

  cd ../..
done
