#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const DEFAULT_MIX = {
  structure: 72,
  perception: 58,
  meaning: 52,
  distribution: 34
};

const DEFAULT_SKIN = {
  sentenceLength: 56,
  abstraction: 48,
  emotion: 32
};

const DEFAULT_TASK = {
  contentType: "news",
  primaryGoal: "clarity",
  audience: 55
};

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "";
    args[key.replace(/^--/, "")] = value;
    if (value) i += 1;
  }
  return args;
};

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
};

const loadText = async (args) => {
  if (args.text) return args.text;
  if (args.input) return readFile(args.input, "utf-8");
  return readStdin();
};

const loadFacts = async (args, style) => {
  if (args.facts) {
    const text = await readFile(args.facts, "utf-8");
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return Array.isArray(style?.facts) ? style.facts : [];
};

const loadStyle = async (args) => {
  if (!args.style) {
    return { mix: DEFAULT_MIX, skin: DEFAULT_SKIN, task: DEFAULT_TASK, customPrompt: "" };
  }
  const raw = await readFile(args.style, "utf-8");
  const parsed = JSON.parse(raw);
  return {
    mix: parsed.mix ?? DEFAULT_MIX,
    skin: parsed.skin ?? DEFAULT_SKIN,
    task: parsed.task ?? DEFAULT_TASK,
    customPrompt: parsed.customPrompt ?? ""
  };
};

const buildPrompt = ({ rawText, facts, mix, skin, task, customPrompt }) => {
  const factLock = facts.length
    ? `\n\nFact Lock:\n- ${facts.join("\n- ")}`
    : "";
  const custom = customPrompt?.trim()
    ? `\n\n自定义补充（Custom Prompt）：\n${customPrompt.trim()}`
    : "";

  return `任务：对以下内容进行Remix\n\n内容：\n"""\n${rawText}\n"""\n\n风格参数（0-100）：\n- Structure: ${mix.structure}\n- Perception: ${mix.perception}\n- Meaning: ${mix.meaning}\n- Distribution: ${mix.distribution}\n\n语言皮肤（0-100）：\n- Sentence Length: ${skin.sentenceLength}\n- Abstraction: ${skin.abstraction}\n- Emotion: ${skin.emotion}\n\n任务配置：\n${JSON.stringify(task)}${custom}${factLock}`;
};

const run = async () => {
  const args = parseArgs(process.argv);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const rawText = (await loadText(args)).trim();
  if (!rawText) {
    console.error("Missing input text. Use --text, --input, or stdin.");
    process.exit(1);
  }

  const style = await loadStyle(args);
  const facts = await loadFacts(args, style);
  const prompt = buildPrompt({
    rawText,
    facts,
    mix: style.mix,
    skin: style.skin,
    task: style.task,
    customPrompt: style.customPrompt
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "你是一个风格编曲写作引擎，只输出最终成稿文本，不要解释过程。"
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`OpenAI error: ${response.status}`);
    console.error(errText);
    process.exit(1);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim() ?? "";

  if (!content) {
    console.error("No output received.");
    process.exit(1);
  }

  if (args.out) {
    await writeFile(args.out, content, "utf-8");
    console.log(`Saved to ${args.out}`);
  } else {
    process.stdout.write(`${content}\n`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
