#! /bin/bash
# Note: this script is ment to be run in the docker container.
# To build with docker, run: yarn build:docker or ./docker-build.sh

# check if folder exists
if [ ! -d "/app" ]; then
  echo "Folder /app does not exist. Please make sure its mounted"
  exit 1
fi

echo Ensuring packages are installed...
yarn

echo Building...
yarn build
