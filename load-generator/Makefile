IMAGE ?= quay.io/rhdh-community/rhdh-loadtest
TAG ?= latest

build:
	podman build -t $(IMAGE):$(TAG) .

run:
	podman run --rm $(IMAGE):$(TAG)

