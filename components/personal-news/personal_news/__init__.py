from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from editor.client import generate_broadcast_script  # noqa: E402


def generate_broadcast(config: Dict[str, Any], inputs: List[Dict[str, Any]]) -> str:
    payload = {"config": config or {}, "inputs": inputs or []}
    return generate_broadcast_script(payload)


__all__ = ["generate_broadcast"]

