#!/bin/bash
# Note: If you have any local changes to package.json files, please commit or stash them before running this script, as it will overwrite those files.

set -e

kubectl get secret openshift-gitops-cluster -n openshift-gitops -o jsonpath='{.data.admin\.password}' | base64 -d
echo
