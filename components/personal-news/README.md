# 个人新闻联播

从多源输入（RSS、X、Gmail、日程、天气）生成结构化、可播报的个人新闻稿。

## 功能特点
- 统一多源数据并按重要性与新鲜度排序。
- RSS 与 X 事件语义去重。
- 固定栏目顺序与播报语气。
- 私密信息脱敏（邮箱、疑似手机号）。
- 按目标时长裁剪输出。

## 安装 / 导入

Python 包位于 `personal_news`。

```python
from personal_news import generate_broadcast
```

## 使用方法

```python
from personal_news import generate_broadcast

config = {
    "max_duration_seconds": 240,
    "language": "zh-CN",
    "mode": "morning",
    "city": "Beijing",
}

inputs = [
    {
        "source": "rss",
        "items": [
            {
                "title": "AI policy update",
                "summary": "Regulators发布新的AI政策框架。",
                "published_at": "2026-01-20T08:30:00Z",
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
                "created_at": "2026-01-20T09:00:00Z",
            }
        ],
    },
    {"source": "weather", "items": [{"summary": "多云转小雨，最高气温18度。"}]},
]

script = generate_broadcast(config, inputs)
print(script)
```

## 输入格式（简要）

每个输入为包含 `source` 与 `items` 的字典：

- `rss`: `title`, `summary`, `published_at`, `source_name`
- `x`: `author`, `text`, `engagement.likes`, `engagement.retweets`, `created_at`
- `weather`: `summary`

## 输出规则（简要）
- 纯文本输出（无 Markdown、无 bullet）。
- 固定顺序：片头、今日要闻、个人相关动态、日程、天气、结束语。
- 每栏目最多 3 条（天气最多 1 条）。
- 邮箱与疑似手机号脱敏。

## 测试

在仓库根目录运行：

```sh
pytest personal-news/tests
```

## 辅助网站

本项目提供本地辅助网站，用于文档查阅、快速运行与测试。

```sh
python personal-news/web/app.py
```

然后访问：

```
http://127.0.0.1:5173
```

页面：
- `/docs.html`
- `/run.html`
- `/tests.html`
- `/about.html`

## 主程序

主程序位于 `personal-news/main.py`，整合 `rss`、`x`、`weather` 与 `editor` 子模块，最终输出播报稿。

```sh
python personal-news/main.py personal-news/config.json
```

## 子模块 CLI

每个子模块支持独立运行（输出对应 source 的 JSON items）：

```sh
python personal-news/rss/client.py personal-news/config.json
python personal-news/x/client.py personal-news/config.json
python personal-news/weather/client.py personal-news/config.json
python personal-news/editor/client.py personal-news/temp.json
```

## 子模块文档

- `personal-news/rss/README.md`
- `personal-news/x/README.md`
- `personal-news/weather/README.md`
- `personal-news/editor/README.md`

## 依赖

主程序及子模块使用 `requests` 进行 API 访问：

```sh
pip install requests
```

## 环境变量

为访问真实 API，请设置以下环境变量：
- `X_BEARER_TOKEN`：X API v2 Bearer Token
- `LLM_API_KEY`：LLM 服务 API Key

也可以使用 `personal-news/env.secret` 统一配置（参考 `personal-news/env.secret.example`）。
