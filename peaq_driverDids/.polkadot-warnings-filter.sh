#!/bin/bash
# Filters out @polkadot version warnings
node "$@" 2>&1 | grep -v -E "(@polkadot|Either remove and explicitly|The following conflicting|cjs [0-9]+\.[0-9]+\.[0-9]+|esm [0-9]+\.[0-9]+\.[0-9]+)" || true

