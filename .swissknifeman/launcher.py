#!/usr/bin/env python3
"""Swiss Knife Man project launcher (managed file: `swissknifeman project sync` rewrites it; do not edit).

Run `python3 -I .swissknifeman/launcher.py <group> <args...>`. The project root is the folder that holds this file's
`.swissknifeman/`; the launcher passes it to the installed `swissknifeman` and replaces itself with it. No other logic.
"""
import os
import shutil
import stat
import sys
from pathlib import Path

PROTOCOL = "1"
NAME = "launcher.py"
DIRNAME = ".swissknifeman"


def fail(code, message, exit_code=1):
    print(f"{code}: {message}", file=sys.stderr)
    raise SystemExit(exit_code)


raw = Path(__file__).absolute()
try:
    mode = raw.lstat().st_mode
except OSError as exc:
    fail("LAUNCHER_UNREADABLE", str(exc))
if stat.S_ISLNK(mode):
    fail("LAUNCHER_SYMLINK_FORBIDDEN", str(raw))
if not stat.S_ISREG(mode):
    fail("LAUNCHER_NOT_REGULAR", str(raw))
if raw.name != NAME or raw.parent.name != DIRNAME:
    fail("LAUNCHER_LOCATION_INVALID", str(raw))
try:
    root = raw.parent.parent.resolve(strict=True)
    launcher = raw.resolve(strict=True)
    cwd = Path.cwd().resolve(strict=True)
except OSError as exc:
    fail("PROJECT_PATH_INVALID", str(exc))
if launcher != root / DIRNAME / NAME:
    fail("LAUNCHER_LOCATION_INVALID", f"expected {root / DIRNAME / NAME}")

command = shutil.which("swissknifeman")
if command is None:
    fail("HUB_NOT_INSTALLED", "install Swiss Knife Man or add its bin directory to PATH", 127)
hub = Path(command).resolve()
if hub == launcher:
    fail("LAUNCHER_RECURSION", str(hub))

env = os.environ.copy()
env.pop("PYTHONPATH", None)
env.pop("SKM_PROJECT_ROOT", None)
env["SKM_LAUNCHER_ACTIVE"] = "1"
env["SKM_LAUNCHER_PROTOCOL"] = PROTOCOL
env["SKM_LAUNCHER_PATH"] = str(launcher)
env["SKM_LAUNCHER_PROJECT_ROOT"] = str(root)
env["SKM_LAUNCHER_PID"] = str(os.getpid())
env["SKM_INVOCATION_CWD"] = str(cwd)
sys.stdout.flush()
sys.stderr.flush()
os.execve(command, [command, *sys.argv[1:]], env)
