#!/usr/bin/env bash
# Validate and pretty-print an IAM policy JSON file.
# Usage: ./validate_policy.sh [policy-file] [--simulate principal-arn action1 action2 ...]
# Examples:
#   ./validate_policy.sh bedrock-invoke-policy.json
#   ./validate_policy.sh bedrock-invoke-policy.json --simulate arn:aws:iam::123:role/MyRole bedrock:InvokeModel

set -euo pipefail
POLICY_FILE=${1:-bedrock-invoke-policy.json}
shift || true

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to pretty-print and validate JSON. Install it (apt install jq) and re-run." >&2
  exit 2
fi

if [ ! -f "$POLICY_FILE" ]; then
  echo "Policy file not found: $POLICY_FILE" >&2
  exit 2
fi

echo "Pretty-printing $POLICY_FILE"
jq . "$POLICY_FILE"

# Basic structural checks
echo
echo "Running basic structural checks..."
MISSING=false
if ! jq -e '.Version and .Statement' "$POLICY_FILE" >/dev/null; then
  echo "ERROR: policy missing required top-level 'Version' or 'Statement' fields." >&2
  MISSING=true
fi

if $MISSING; then
  exit 3
fi

echo "Top-level keys present. To run the AWS Policy Simulator, pass --simulate <principal-arn> <action> [<action2> ...]"

if [ "${1:-}" = "--simulate" ]; then
  shift
  PRINCIPAL=${1:-}
  shift || true
  if [ -z "$PRINCIPAL" ]; then
    echo "Must supply principal ARN after --simulate" >&2
    exit 4
  fi
  if [ $# -eq 0 ]; then
    echo "Must supply at least one action to simulate" >&2
    exit 4
  fi

  echo "Calling AWS IAM Policy Simulator for principal: $PRINCIPAL"
  aws iam simulate-principal-policy \
    --policy-source-arn "$PRINCIPAL" \
    --action-names $(printf "%s " "$@") \
    --output json | jq .
fi

exit 0
