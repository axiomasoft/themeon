#!/usr/bin/env python3
"""Project hook entrypoint — delegates to the managed harness lifecycle handler.

Cursor `beforeShellExecution` with `failClosed: true` requires JSON on stdout.
The harness handler still uses Claude-style silent allow (exit 0, empty body);
translate that to `{"permission":"allow"}` without weakening rm/rmdir denial.
"""
import json
import subprocess
import sys

_TARGET = "/home/vostrikov/projects/packages/botkit/.cursor/hooks/lifecycle.py"
_SHELL_SURFACES = frozenset(
    {
        "security.safe-dirs",
        "lifecycle.daemon-safety",
        "lifecycle.git-guardrails",
        "lifecycle.changelog-gate",
    }
)


def _surface() -> str:
    args = sys.argv[1:]
    if "--surface" in args:
        index = args.index("--surface")
        if index + 1 < len(args):
            return args[index + 1]
    return ""


if __name__ == "__main__":
    proc = subprocess.run(
        [sys.executable, _TARGET, *sys.argv[1:]],
        stdin=sys.stdin,
        capture_output=True,
    )
    if proc.stderr:
        sys.stderr.buffer.write(proc.stderr)
    stdout = proc.stdout or b""
    if stdout.strip():
        sys.stdout.buffer.write(stdout)
        raise SystemExit(proc.returncode)
    if proc.returncode == 0 and _surface() in _SHELL_SURFACES:
        sys.stdout.write(json.dumps({"permission": "allow"}) + "\n")
        raise SystemExit(0)
    raise SystemExit(proc.returncode)
