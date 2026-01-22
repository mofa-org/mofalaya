from x.client import fetch_x_items


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("status error")

    def json(self):
        return self._data


def test_fetch_x_items(monkeypatch):
    def fake_get(url, headers=None, params=None, timeout=10):
        if "users/by/username" in url:
            return FakeResponse({"data": {"id": "123"}})
        return FakeResponse(
            {
                "data": [
                    {
                        "text": "Hello",
                        "created_at": "2026-01-20T08:00:00Z",
                        "public_metrics": {"like_count": 5, "retweet_count": 1},
                    }
                ]
            }
        )

    monkeypatch.setenv("X_BEARER_TOKEN", "token")
    monkeypatch.setattr("requests.get", fake_get)
    items = fetch_x_items({"x_priority_accounts": ["alice"]})
    assert items
    assert items[0]["engagement"]["likes"] == 5
