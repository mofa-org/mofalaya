from datetime import datetime, timedelta, timezone

from personal_news import generate_broadcast


def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def test_basic_generation_order_and_masking():
    now = datetime.now(timezone.utc)
    inputs = [
        {
            "source": "rss",
            "items": [
                {
                    "title": "AI policy update",
                    "summary": "Regulators发布新的AI政策框架。",
                    "published_at": _iso(now - timedelta(hours=2)),
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
                    "created_at": _iso(now - timedelta(hours=1)),
                }
            ],
        },
        {
            "source": "gmail",
            "items": [
                {
                    "from": "ceo@company.com",
                    "subject": "Review meeting",
                    "snippet": "请于本周确认时间。",
                    "received_at": _iso(now - timedelta(hours=3)),
                }
            ],
        },
        {
            "source": "calendar",
            "items": [
                {
                    "title": "Product sync",
                    "start": _iso(now + timedelta(hours=4)),
                    "end": _iso(now + timedelta(hours=5)),
                    "location": "Room 301",
                }
            ],
        },
        {
            "source": "weather",
            "items": [{"summary": "多云转小雨，最高气温18度。"}],
        },
    ]
    config = {"max_duration_seconds": 240}
    script = generate_broadcast(config, inputs)
    assert "个人新闻联播" in script
    assert script.find("今日要闻") < script.find("与个人相关的动态")
    assert script.find("与个人相关的动态") < script.find("日程速递")
    assert script.find("日程速递") < script.find("生活服务")
    assert "ceo***@company.com" in script
    assert "-" not in script


def test_dedupe_between_rss_and_x():
    now = datetime.now(timezone.utc)
    inputs = [
        {
            "source": "rss",
            "items": [
                {
                    "title": "SpaceX launches new rocket",
                    "summary": "SpaceX launches new rocket successfully.",
                    "published_at": _iso(now - timedelta(hours=1)),
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
                    "created_at": _iso(now - timedelta(hours=1)),
                }
            ],
        },
    ]
    script = generate_broadcast({}, inputs)
    assert script.count("今日要闻方面") == 0
    assert script.count("与个人相关的动态中") == 1


def test_duration_trimming():
    now = datetime.now(timezone.utc)
    long_text = "A" * 800
    inputs = [
        {
            "source": "rss",
            "items": [
                {
                    "title": long_text,
                    "summary": long_text,
                    "published_at": _iso(now - timedelta(hours=2)),
                    "source_name": "Source",
                }
            ],
        },
        {
            "source": "weather",
            "items": [{"summary": long_text}],
        },
    ]
    script = generate_broadcast({"max_duration_seconds": 10}, inputs)
    assert "生活服务方面" not in script
    assert "今日要闻方面" in script
