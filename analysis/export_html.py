"""
export_html.py
Export marimo notebook to standalone HTML for sharing.
Usage: uv run python analysis/export_html.py
"""

import subprocess
import sys
import os
from pathlib import Path

NOTEBOOK = "analysis/eda_notebook.py"
OUTPUT = "analysis/eda_notebook.html"

def main():
    if not Path(NOTEBOOK).exists():
        print(f"Error: {NOTEBOOK} not found")
        sys.exit(1)

    print(f"Exporting {NOTEBOOK} to {OUTPUT}...")

    try:
        result = subprocess.run(
            ["python", "-m", "marimo", "export", "html", NOTEBOOK, "--output", OUTPUT],
            capture_output=True,
            text=True,
        )

        if result.returncode == 0:
            print(f"✓ Successfully exported to {OUTPUT}")
            print(f"  File size: {Path(OUTPUT).stat().st_size / 1024:.1f} KB")
        else:
            print(f"Warning: {result.stderr}")
            if Path(OUTPUT).exists():
                print(f"  File created: {Path(OUTPUT).stat().st_size / 1024:.1f} KB")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()