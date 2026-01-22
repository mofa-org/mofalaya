from weather.client import fetch_weather


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("status error")

    def json(self):
        return self._data


def test_fetch_weather_builds_summary(monkeypatch):
    def fake_get(*args, **kwargs):
        return FakeResponse(
            {
                "weather": [{"description": "多云"}],
                "main": {"temp_min": 12.3, "temp_max": 19.6},
                "wind": {"speed": 3.2},
            }
        )

    monkeypatch.setenv("WEATHER_API_KEY", "test")
    monkeypatch.setattr("requests.get", fake_get)
    items = fetch_weather({"city": "Beijing"})
    assert items
    assert "多云" in items[0]["summary"]
    assert "最高气温" in items[0]["summary"]
