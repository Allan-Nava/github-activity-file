#!/bin/bash
set -e
echo "update.sh init() | Github Activity File |"
npm run build
git add .
git commit -m "update files"
git push 
echo "update.sh init() | Github Activity File |"