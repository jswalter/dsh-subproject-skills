#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
dsh_app=${DSH_APP_PATH:-/Applications/DeepSeek Harness.app}
if [ ! -x "$dsh_app/Contents/MacOS/DeepSeek Harness" ]; then
  echo 'DSH not found. Set DSH_APP_PATH to your installed DeepSeek Harness.app.' >&2
  exit 1
fi
ELECTRON_RUN_AS_NODE=1 exec "$dsh_app/Contents/MacOS/DeepSeek Harness" --expose-internals "$package_dir/install.cjs" --resources "$dsh_app/Contents/Resources" "$@"
