#!/bin/bash

# Usage: ./gpush.sh "Your commit message"

# Exit if no commit message
if [ -z "$1" ]; then
  echo "Commit message is required."
  exit 1
fi

# Run git commands
git add .
git commit -m "$1"
git push