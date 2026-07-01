#!/bin/bash
# Note: If you have any local changes to package.json files, please commit or stash them before running this script, as it will overwrite those files.

set -e

# Fail if there is changes to the package.json files, to prevent overwriting local changes
if git diff --exit-code -- plugins/backstage-*/package.json; then
  echo "No local changes to package.json files, proceeding with setting resolutions."
else
  echo "Error: There are local changes to package.json files. Please commit or stash them before running this script."
  exit 1
fi

for workspace in plugins/backstage-*; do
  echo "Setting resolutions for workspace $workspace"

  backstage_version=$(jq -r ".version" < "$workspace/backstage.json")

  echo "  Backstage version: $backstage_version"
  echo

  # Read exact versions for this version from GitHub
  manifest_url="https://raw.githubusercontent.com/backstage/versions/refs/heads/main/v1/releases/$backstage_version/manifest.json"
  echo "  Fetching manifest from: $manifest_url"
  # Merge resolutions into the plugin's package.json
  resolutions=$(curl -s "$manifest_url" | jq -r '.packages | map({(.name): .version}) | add')

  # echo -n "  Resolutions: "
  # echo "$resolutions" | jq .

  # Update package.json and merge resolutions
  jq --argjson resolutions "$resolutions" \
    '.resolutions = ($resolutions + (.resolutions // {}))' \
    "$workspace/package.json" > "$workspace/package.json.tmp" && mv "$workspace/package.json.tmp" "$workspace/package.json"
done

echo "All plugin resolutions have been updated."
echo
echo "Please run 'yarn install' to update the lockfile with the new resolutions."
echo
