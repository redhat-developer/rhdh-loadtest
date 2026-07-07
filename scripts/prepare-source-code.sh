#!/bin/bash

# This script prepares a workspace for building container images.
#
# It replaces the "-n" code in the plugins with the code for the given suffix.
#
# With suffix is "n", the code should be restored to the original state so that there is no git diff after running this script.

set -e

workspace="$1"
suffix="$2"
suffix_upper="${suffix^^}"

echo "Prepare source code in workspace $workspace with suffix $suffix"

replace_in_plugin() {
  local plugin_dir="$1"
  local kebab="$2"
  local title="$3"

  find "$plugin_dir" \( -name "*.json" -o -name "*.ts" -o -name "*.tsx" \) -exec \
    sed -i -E \
      -e "s/${kebab}-(n|[0-9]+)/${kebab}-${suffix}/g" \
      -e "s/${title} (N|[0-9]+)/${title} ${suffix_upper}/g" \
      {} +
}

replace_in_plugin "$workspace/plugins/page-n" "page" "Page"
replace_in_plugin "$workspace/plugins/catalog-tab-n" "catalog-tab" "Catalog Tab"

echo Done.
