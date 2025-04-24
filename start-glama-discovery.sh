#!/bin/bash

# Stop any existing server on port 8080
fuser -k 8080/tcp 2>/dev/null || echo "No process running on port 8080"

# Create public directory structure if needed
mkdir -p public/.well-known

# Ensure glama.json exists in both locations
if [ -f .well-known/glama.json ]; then
  cp .well-known/glama.json public/.well-known/glama.json
  echo "Copied glama.json from .well-known to public/.well-known"
fi

# Start HTTP server
echo "Starting HTTP server on port 8080"
http-server ./public -p 8080 --cors -d false -i false -c-1 -s

# Note: Keep this script running in the terminal to serve the discovery endpoint