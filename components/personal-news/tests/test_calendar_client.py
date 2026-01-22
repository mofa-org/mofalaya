import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("calendar_client", ROOT / "calendar" / "client.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fetch_calendar_items = module.fetch_calendar_items


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("status error")

    def json(self):
        return self._data


def test_fetch_calendar_items(monkeypatch):
    def fake_get(url, headers=None, params=None, timeout=10):
        return FakeResponse(
            {
                "items": [
                    {
                        "summary": "Sync",
                        "start": {"dateTime": "2026-01-20T10:00:00Z"},
                        "end": {"dateTime": "2026-01-20T11:00:00Z"},
                        "location": "Room 1",
                    }
                ]
            }
        )

    monkeypatch.setenv("CALENDAR_ACCESS_TOKEN", "token")
    monkeypatch.setattr("requests.get", fake_get)
    items = fetch_calendar_items({})
    assert items
    assert items[0]["title"] == "Sync"
