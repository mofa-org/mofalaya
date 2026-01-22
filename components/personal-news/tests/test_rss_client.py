from rss.client import fetch_rss_items


class FakeResponse:
    def __init__(self, text, status_code=200):
        self.text = text
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("status error")


def test_fetch_rss_items(monkeypatch):
    rss_text = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Example News</title>
        <item>
          <title>Story A</title>
          <description>Summary A</description>
          <link>https://example.com/story-a</link>
          <pubDate>Mon, 20 Jan 2026 08:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>
    """

    def fake_get(url, timeout=10):
        if url == "https://example.com/rss":
            return FakeResponse(rss_text)
        return FakeResponse("<html><body><p>Full story text.</p></body></html>")

    monkeypatch.setattr("requests.get", fake_get)
    items = fetch_rss_items({"rss_sources": ["https://example.com/rss"]})
    assert items
    assert items[0]["source_name"] == "Example News"
    assert "Full story text." in items[0]["summary"]
