from gmail.client import fetch_gmail_items


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("status error")

    def json(self):
        return self._data


def test_fetch_gmail_items(monkeypatch):
    def fake_get(url, headers=None, params=None, timeout=10):
        if url.endswith("/messages"):
            return FakeResponse({"messages": [{"id": "abc"}]})
        return FakeResponse(
            {
                "snippet": "Please confirm",
                "internalDate": "1766160000000",
                "payload": {
                    "headers": [
                        {"name": "Subject", "value": "Meeting"},
                        {"name": "From", "value": "boss@company.com"},
                    ]
                },
            }
        )

    monkeypatch.setenv("GMAIL_ACCESS_TOKEN", "token")
    monkeypatch.setattr("requests.get", fake_get)
    items = fetch_gmail_items({"gmail_priority_senders": ["company.com"]})
    assert items
    assert items[0]["subject"] == "Meeting"
