#!/usr/bin/env bash
# Installs headless Blender (bpy) into /opt/blender-venv if it's not already there.
# Only needed when rebuilding models (the built assets are committed). Takes ~10-20 min on a slow link.
set -euo pipefail
if /opt/blender-venv/bin/python -c "import bpy" >/dev/null 2>&1; then
  echo "Blender already installed: $(/opt/blender-venv/bin/python -c 'import bpy; print(bpy.app.version_string)')"
  exit 0
fi
python3 -m venv /opt/blender-venv
/opt/blender-venv/bin/pip install -q bpy==5.2.3
/opt/blender-venv/bin/python -c "import bpy; print('Blender', bpy.app.version_string)"
