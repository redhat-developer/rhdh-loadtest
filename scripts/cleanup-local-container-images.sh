#!/bin/bash

set -e

function list_container_images() {
  podman images --filter=reference='localhost/rhdh-loadtest-plugins:*' \
    --format '{{.Repository}}:{{.Tag}}'
}

# list local podman containers
echo
echo Will delete the following local container images:
echo
list_container_images

echo
echo Wait 10 seconds...
echo 
sleep 10
echo Cleanup...
echo

list_container_images | xargs -n 1 -r podman rmi

echo Done.
echo
