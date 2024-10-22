#!/bin/bash

#==============================================================================#
#                                  SETUP                                       #
#==============================================================================#

# Start in scripts/integration-tests/ even if run from root directory
cd "$(dirname "$0")"

source utils/local-registry.sh
source utils/git.sh
source utils/cleanup.sh

function publishESLintPkg {
  cd eslint/$1
  npm version $2 --no-git-tag-version
  cd ../..
  make -j publish-eslint PKG=$1
}

# Echo every command being executed
set -x

# Go to the root of the monorepo
cd ../..

initializeE2Egit

#==============================================================================#
#                                 PUBLISH                                      #
#==============================================================================#

yarn

startLocalRegistry "$PWD"/scripts/integration-tests/verdaccio-config.yml
loginLocalRegistry

# This script gets the last @babel/standalone version (because it's always published),
# and then increases by one the patch number
VERSION=$(
  node -p "'$(npm view @babel/standalone version)'.replace(/(?<=\\d+\\.\\d+\\.)\\d+/, x => ++x)"
)

I_AM_USING_VERDACCIO=I_AM_SURE VERSION="$VERSION" make publish-test

publishESLintPkg babel-eslint-config-internal "$VERSION"
publishESLintPkg babel-eslint-parser "$VERSION"
publishESLintPkg babel-eslint-plugin "$VERSION"
publishESLintPkg babel-eslint-plugin-development "$VERSION"

cleanup
