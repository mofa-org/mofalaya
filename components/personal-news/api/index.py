from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from flask import Flask, jsonify, request

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from personal_news import generate_broadcast  # noqa: E402

app = Flask(__name__)


def _resolve_readme_path(target: str) -> Path | None:
    if target == "README.md":
        return ROOT / "README.md"
    if not re.fullmatch(r"[A-Za-z0-9_-]+/README\.md", target):
        return None
    candidate = (ROOT / target).resolve()
    if ROOT.resolve() not in candidate.parents:
        return None
    return candidate


def _evaluate_script(
    name: str,
    script: str,
    *,
    contains: Optional[List[str]] = None,
    not_contains: Optional[List[str]] = None,
    order: Optional[List[Tuple[str, str]]] = None,
) -> Dict[str, Any]:
    errors: List[str] = []
    contains = contains or []
    not_contains = not_contains or []
    order = order or []
    for token in contains:
        if token not in script:
            errors.append(f"missing: {token}")
    for token in not_contains:
        if token in script:
            errors.append(f"should not contain: {token}")
    for earlier, later in order:
        pos_earlier = script.find(earlier)
        pos_later = script.find(later)
        if pos_earlier == -1 or pos_later == -1 or pos_earlier >= pos_later:
            errors.append(f"order: {earlier} -> {later}")
    return {
        "name": name,
        "passed": not errors,
        "detail": "通过" if not errors else "; ".join(errors),
    }


def _run_sample_tests() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    inputs = [
        {
            "source": "rss",
            "items": [
                {
                    "title": "AI policy update",
                    "summary": "Regulators发布新的AI政策框架。",
                    "published_at": (now - timedelta(hours=2)).isoformat(),
                    "source_name": "TechDaily",
                }
            ],
        },
        {
            "source": "x",
            "items": [
                {
                    "author": "founderA",
                    "text": "我们刚发布新版本，细节见链接。",
                    "engagement": {"likes": 120, "retweets": 30},
                    "created_at": (now - timedelta(hours=1)).isoformat(),
                }
            ],
        },
        {
            "source": "weather",
            "items": [{"summary": "多云转小雨，最高气温18度。"}],
        },
    ]
    script = generate_broadcast({"max_duration_seconds": 240}, inputs)
    results = []
    results.append(
        _evaluate_script(
            "section-order",
            script,
            order=[("今日要闻", "与个人相关的动态"), ("与个人相关的动态", "生活服务")],
        )
    )
    results.append(_evaluate_script("weather-present", script, contains=["生活服务方面"]))

    inputs = [
        {
            "source": "rss",
            "items": [
                {
                    "title": "SpaceX launches new rocket",
                    "summary": "SpaceX launches new rocket successfully.",
                    "published_at": (now - timedelta(hours=1)).isoformat(),
                    "source_name": "SpaceNews",
                }
            ],
        },
        {
            "source": "x",
            "items": [
                {
                    "author": "spacex",
                    "text": "SpaceX launches new rocket successfully.",
                    "engagement": {"likes": 500, "retweets": 200},
                    "created_at": (now - timedelta(hours=1)).isoformat(),
                }
            ],
        },
    ]
    script = generate_broadcast({}, inputs)
    results.append(
        _evaluate_script(
            "dedupe-rss-x",
            script,
            contains=["与个人相关的动态中"],
            not_contains=["今日要闻方面"],
        )
    )
    return results


def _run_custom_tests(cases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for case in cases:
        name = case.get("name", "unnamed")
        config = case.get("config", {})
        inputs = case.get("inputs", [])
        try:
            script = generate_broadcast(config, inputs)
        except Exception as exc:  # noqa: BLE001
            results.append({"name": name, "passed": False, "detail": f"error: {exc}"})
            continue
        results.append(
            _evaluate_script(
                name,
                script,
                contains=case.get("contains"),
                not_contains=case.get("not_contains"),
                order=case.get("order"),
            )
        )
    return results


@app.get("/api/readme")
def api_readme():
    target = request.args.get("path", "README.md")
    readme_path = _resolve_readme_path(target)
    if not readme_path or not readme_path.exists():
        return jsonify({"error": "README not found"}), 404
    content = readme_path.read_text(encoding="utf-8")
    return jsonify({"content": content})


@app.post("/api/generate")
def api_generate():
    payload = request.get_json(silent=True) or {}
    try:
        config = payload.get("config", {})
        inputs = payload.get("inputs", [])
        script = generate_broadcast(config, inputs)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        return jsonify({"error": f"Invalid payload: {exc}"}), 400
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500
    return jsonify({"script": script})


@app.post("/api/run-tests")
def api_run_tests():
    payload = request.get_json(silent=True) or {}
    cases = payload.get("tests") if isinstance(payload, dict) else None
    try:
        if cases:
            results = _run_custom_tests(cases)
        else:
            results = _run_sample_tests()
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": str(exc)}), 500
    return jsonify({"results": results})

