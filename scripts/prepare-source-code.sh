#!/bin/bash

# This script prepares a workspace for building container images.
#
# It replaces the "-n" code in the plugins with the code for the given suffix.
#
# With suffix is "n", the code should be restored to the original state so that there is no git diff after running this script.

set -e

workspace="$1"
suffix="$2"

echo "Prepare source code in workspace $workspace with suffix $suffix"

# page-n
sed -i -E "s/page-(n|[0-9]+)/page-$suffix/g" \
    "$workspace/plugins/page-n/README.md" \
    "$workspace/plugins/page-n/package.json" \
    "$workspace/plugins/page-n/src/plugin.ts" \
    "$workspace/plugins/page-n/src/routes.ts" \
    "$workspace/plugins/page-n/src/alpha/plugin.tsx" \
    "$workspace/plugins/page-n/src/components/ExampleComponent/ExampleComponent.tsx" \
    "$workspace/plugins/page-n/dev/index.tsx" \
    "$workspace/plugins/page-n/dev/legacy.tsx" \
    "$workspace/plugins/page-n/dev/alpha.tsx"

# catalog-tab-n
sed -i -E "s/catalog-tab-(n|[0-9]+)/catalog-tab-$suffix/g" \
    "$workspace/plugins/catalog-tab-n/README.md" \
    "$workspace/plugins/catalog-tab-n/package.json" \
    "$workspace/plugins/catalog-tab-n/src/plugin.ts" \
    "$workspace/plugins/catalog-tab-n/src/alpha/plugin.tsx" \
    "$workspace/plugins/catalog-tab-n/src/components/ExampleComponent/ExampleComponent.tsx" \
    "$workspace/plugins/catalog-tab-n/dev/index.tsx" \
    "$workspace/plugins/catalog-tab-n/dev/legacy.tsx" \
    "$workspace/plugins/catalog-tab-n/dev/alpha.tsx"

echo Done.
