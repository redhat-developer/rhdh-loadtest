# Container image to run a lightweight/simplified performance test with playwright

This does not replace any 'real' performance tests / our Red Hat performance team.

The goal here is to make results reproducable and testable on smaller test environments.

## Run it locally

```shell
cd worker
npm install
export RHDH_URL=...
npm test
```

## Run it on a cluster

```shell
podman build . --tag ...
# TODO ...
```
