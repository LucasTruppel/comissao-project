# routers/utils.py
from pathlib import Path


# Resolve resource paths relative to this file so the code works
# when run inside Docker (where the working directory may be different).
PACKAGE_ROOT = Path(__file__).resolve().parent.parent
RESOURCES_BASE = PACKAGE_ROOT / "resources" / "base"


def find_resource_file(filename: str) -> str:
    """Return the first existing candidate path for a resource file.

    Candidates (in order):
      - package-root/resources/base/<filename>  (common when resources are inside the app folder)
      - package-root.parent/resources/base/<filename>  (common when resources are sibling to app/)
      - Path.cwd()/resources/base/<filename>  (fallback to current working directory)

    If none exist, return the first candidate (so the existing FileNotFoundError shows a sensible path).
    """
    candidates = [
        RESOURCES_BASE / filename,
        (PACKAGE_ROOT.parent / "resources" / "base" / filename),
        (Path.cwd() / "resources" / "base" / filename),
    ]

    for cand in candidates:
        try:
            if cand.exists():
                return str(cand)
        except Exception:
            # If any permission/IO oddity happens, ignore and try next
            continue

    # none found; return the first candidate for clearer error reporting later
    return str(candidates[0])

