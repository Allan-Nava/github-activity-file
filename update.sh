#!/bin/bash
set -e
echo "update.sh init() | Github Activity File |"
npx prettier --write .
git add .
git commit -m "update files"
git push 
echo "update.sh init() | Github Activity File |"