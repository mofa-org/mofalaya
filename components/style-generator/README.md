# 风格生成器（Style Generator）

一个可直接部署到 Vercel 的 Remix Engine 控制台 Web App。可输入原文、调节风格混音参数、预览分阶段产出，并导出 JSON 配置用于后端集成。

## 功能（Features）
- 内容与任务配置（Content & Task）
- 风格混音滑块（Style Mixer：structure / perception / meaning / distribution）
- 语言皮肤控制（Language Skin：sentence length / abstraction / emotion）
- 多阶段模拟输出（Stages：canonical / structure plan / final）
- 风格热力图与诊断提示（Style Heatmap & Diagnostics）
- 可导出的后端 JSON 配置（Export Payload）
- 风格生成与配置页（Style Builder）：Prompt 生成参数 + 可视化变化 + 本地存档

## 技术栈（Tech Stack）
- Next.js 14（App Router）
- React 18
- TypeScript

## 本地开发（Local Development）
```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

## 构建与运行（Build）
```bash
npm run build
npm start
```

## 部署（Vercel）
1. 将该目录提交到 Git 仓库。
2. 在 Vercel 导入该仓库。
3. 使用默认 Next.js 配置即可。

## CLI Remix（本地调用 OpenAI）
最简单方式：把文本通过 stdin 传入，并指定风格配置 JSON。

```bash
export OPENAI_API_KEY=your_key
npm run remix -- --input input.txt --style style.json
```

可选参数：
- `--text "..."` 直接传文本
- `--facts facts.txt` 每行一条事实锁定
- `--out output.txt` 输出到文件

风格配置文件示例（style.json）：
```json
{
  "mix": { "structure": 70, "perception": 55, "meaning": 50, "distribution": 35 },
  "skin": { "sentenceLength": 55, "abstraction": 45, "emotion": 30 },
  "task": { "contentType": "news", "primaryGoal": "clarity", "audience": 55 },
  "customPrompt": "更克制，减少形容词。"
}
```

## 后端接入（Backend Integration）
当前前端使用 `src/app/page.tsx` 内的 mock `runRemixEngine`。接入后端后可替换为 API 调用（如 `/api/remix/run`），并发送：
- `rawText`
- `facts`
- `task`, `mix`, `skin`

页面已支持渲染后端返回的 `canonical`、`structurePlan`、`final`。

风格生成页使用 `/api/style/parse` 调用 OpenAI，将 Prompt 解析成参数。需要配置环境变量：
- `OPENAI_API_KEY`
- `OPENAI_MODEL`（可选，默认 `gpt-4o-mini`）

编曲台使用 `/api/remix/run` 调用 OpenAI 生成 Remix 成稿文本，使用同一组环境变量。

## 项目结构（Project Structure）
- `src/app/page.tsx` 主要界面 + mock 逻辑
- `src/app/globals.css` 全局样式与布局
- `src/app/layout.tsx` 字体与元信息

## 说明（Notes）
- 项目保持最小化，以便快速 Vercel 部署。
- mock 引擎仅用于演示，后续可替换为真实多 Agent 管线。
