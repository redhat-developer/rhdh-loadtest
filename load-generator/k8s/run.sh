#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NAMESPACE=rhdh-loadtest
TIMEOUT=1800s

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

echo "Creating Job..."
JOB_NAME=$(
  kubectl create --dry-run=client -o yaml -n "$NAMESPACE" -f "$SCRIPT_DIR/job.yaml" |
  kubectl set env -f - --local -o yaml \
    RHDH_URL="${RHDH_URL:-}" \
    LOOPS="${LOOPS:-}" |
  kubectl create -n "$NAMESPACE" -f - -o jsonpath='{.metadata.name}'
)
echo "Job: $JOB_NAME"

echo "Waiting for Job to complete or fail..."
kubectl wait -n "$NAMESPACE" --for=condition=complete --timeout="$TIMEOUT" "job/$JOB_NAME" &
PID_COMPLETE=$!
kubectl wait -n "$NAMESPACE" --for=condition=failed --timeout="$TIMEOUT" "job/$JOB_NAME" &
PID_FAILED=$!

wait -n "$PID_COMPLETE" "$PID_FAILED"
kill "$PID_COMPLETE" "$PID_FAILED" 2>/dev/null || true
wait "$PID_COMPLETE" "$PID_FAILED" 2>/dev/null || true

echo "Fetching logs from Pod(s)..."
kubectl logs -n "$NAMESPACE" "job/$JOB_NAME" --all-containers

if kubectl wait -n "$NAMESPACE" --for=condition=failed --timeout=0 "job/$JOB_NAME" 2>/dev/null; then
    echo "Job failed!"
    exit 1
fi
