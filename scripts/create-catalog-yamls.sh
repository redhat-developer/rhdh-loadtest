#!/bin/bash

set -e

# Create apis
function apis() {
    local n=$1
    for i in $(seq 1 "$n"); do
    cat <<EOF
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: api-$i
  title: API $i
  description: The place to be, for great artists
  annotations:
    backstage.io/techdocs-ref: url:https://github.com/redhat-developer/rhdh-loadtest/tree/main/techdocs
spec:
  type: grpc
  lifecycle: experimental
  owner: guests
  system: examples
  definition: |
    syntax = "proto3";

    service Exampler {
      rpc Example (ExampleMessage) returns (ExampleMessage) {};
    }

    message ExampleMessage {
      string example = 1;
    };
---
EOF
    done
}

# Example from https://backstage.io/docs/features/software-catalog/descriptor-format/
function components() {
    local n=$1
    for i in $(seq 1 "$n"); do
    cat <<EOF
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: component-$i
  title: Component $i
  description: The place to be, for great artists
  labels:
    example.com/custom: custom_label_value
  annotations:
    backstage.io/techdocs-ref: url:https://github.com/redhat-developer/rhdh-loadtest/tree/main/techdocs
    example.com/service-discovery: artistweb
  tags:
    - java
  links:
    - url: https://admin.example-org.com
      title: Admin Dashboard
      icon: dashboard
      type: admin-dashboard
spec:
  type: website
  lifecycle: production
  owner: group-$i
  system: system-$i
  subcomponentOf: component-$((i - 1))
---
EOF
    done
}

# Create groups
function groups() {
    local n=$1
    for i in $(seq 1 "$n"); do
    cat <<EOF
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: group-$i
  title: Group $i
  description: The place to be, for great artists
  annotations:
    backstage.io/techdocs-ref: url:https://github.com/redhat-developer/rhdh-loadtest/tree/main/techdocs
spec:
  type: team
  children: []
  parent: group-$((i - 1))
---
EOF
    done
}

# Create systems
function systems() {
    local n=$1
    for i in $(seq 1 "$n"); do
    cat <<EOF
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: system-$i
  title: System $i
  description: The place to be, for great artists
  annotations:
    backstage.io/techdocs-ref: url:https://github.com/redhat-developer/rhdh-loadtest/tree/main/techdocs
spec:
  owner: group-$i
---
EOF
    done
}

# Create templates
function templates() {
    local n=$1
    for i in $(seq 1 "$n"); do
    cat <<EOF
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: template-$i
  title: Template $i
  description: An example template
  annotations:
    backstage.io/techdocs-ref: url:https://github.com/redhat-developer/rhdh-loadtest/tree/main/techdocs
spec:
  owner: group-$i
  type: service
  parameters:
    - title: Fill in some steps
      required:
        - message
      properties:
        message:
          title: Message
          type: string
          description: A message to be displayed
          ui:autofocus: true
  steps:
    - id: notify
      name: Notify
      action: notification:send
      input:
        recipients: entity
        entityRefs:
          - user:development/guest
        title: \${{ parameters.message }}
---
EOF
    done
}

for n in 10 100 1000 10000; do
  echo -n "Creating catalog with $n apis ..."
  apis $n > "catalog/apis-$n.yaml"
  # get only the file size only in human readable format
  echo -n " done."
  echo -n -e "\tFile size: $(wc -l < "catalog/apis-$n.yaml" | numfmt --to=iec)  "
  # print loc
  echo -n -e "\tLines of code: $(wc -l < "catalog/apis-$n.yaml")"
  echo
done
echo

for n in 10 100 1000 10000; do
  echo -n "Creating catalog with $n components ..."
  components $n > "catalog/components-$n.yaml"
  # get only the file size only in human readable format
  echo -n " done."
  echo -n -e "\tFile size: $(wc -l < "catalog/components-$n.yaml" | numfmt --to=iec)  "
  # print loc
  echo -n -e "\tLines of code: $(wc -l < "catalog/components-$n.yaml")"
  echo
done
echo

for n in 10 100 1000 10000; do
  echo -n "Creating catalog with $n groups ..."
  groups $n > "catalog/groups-$n.yaml"
  # get only the file size only in human readable format
  echo -n " done."
  echo -n -e "\tFile size: $(wc -l < "catalog/groups-$n.yaml" | numfmt --to=iec)  "
  # print loc
  echo -n -e "\tLines of code: $(wc -l < "catalog/groups-$n.yaml")"
  echo
done
echo

for n in 10 100 1000 10000; do
  echo -n "Creating catalog with $n systems ..."
  systems $n > "catalog/systems-$n.yaml"
  # get only the file size only in human readable format
  echo -n " done."
  echo -n -e "\tFile size: $(wc -l < "catalog/systems-$n.yaml" | numfmt --to=iec)  "
  # print loc
  echo -n -e "\tLines of code: $(wc -l < "catalog/systems-$n.yaml")"
  echo
done
echo

for n in 10 100 1000 10000; do
  echo -n "Creating catalog with $n templates ..."
  templates $n > "catalog/templates-$n.yaml"
  # get only the file size only in human readable format
  echo -n " done."
  echo -n -e "\tFile size: $(wc -l < "catalog/templates-$n.yaml" | numfmt --to=iec)  "
  # print loc
  echo -n -e "\tLines of code: $(wc -l < "catalog/templates-$n.yaml")"
  echo
done
echo
