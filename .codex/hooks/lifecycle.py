#!/usr/bin/env python3
"""Project hook entrypoint — delegates to the managed harness lifecycle handler."""
import subprocess
import sys

_TARGET = "/home/vostrikov/projects/packages/botkit/.codex/hooks/lifecycle.py"

if __name__ == "__main__":
    raise SystemExit(
        subprocess.run(
            [sys.executable, _TARGET, *sys.argv[1:]],
            stdin=sys.stdin,
        ).returncode
    )
