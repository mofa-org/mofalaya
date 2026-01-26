import { NextResponse } from "next/server";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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

const systemPrompt = `你是一个风格参数解析器。\n根据用户的prompt，输出JSON，不要包含多余文本。\n\n输出格式:\n{\n  "mix": {"structure": 0-100, "perception": 0-100, "meaning": 0-100, "distribution": 0-100},\n  "skin": {"sentenceLength": 0-100, "abstraction": 0-100, "emotion": 0-100},\n  "task": {"contentType": "news|novel|nonfiction|commentary|audio", "primaryGoal": "clarity|moving|thinking|viral|long_value", "audience": 0-100},\n  "signals": ["解析到的特征说明...用中文，保留英文术语括号说明"]\n}\n\n要求：\n- 只输出合法JSON\n- 不要解释过程\n- 值必须在0-100内`;

const normalize = (value: number) => clamp(Math.round(value ?? 0), 0, 100);

const sanitize = (payload: any) => {
  const mix = payload?.mix ?? {};
  const skin = payload?.skin ?? {};
  const task = payload?.task ?? {};

  return {
    mix: {
      structure: normalize(mix.structure ?? DEFAULT_MIX.structure),
      perception: normalize(mix.perception ?? DEFAULT_MIX.perception),
      meaning: normalize(mix.meaning ?? DEFAULT_MIX.meaning),
      distribution: normalize(mix.distribution ?? DEFAULT_MIX.distribution)
    },
    skin: {
      sentenceLength: normalize(skin.sentenceLength ?? DEFAULT_SKIN.sentenceLength),
      abstraction: normalize(skin.abstraction ?? DEFAULT_SKIN.abstraction),
      emotion: normalize(skin.emotion ?? DEFAULT_SKIN.emotion)
    },
    task: {
      contentType: task.contentType ?? DEFAULT_TASK.contentType,
      primaryGoal: task.primaryGoal ?? DEFAULT_TASK.primaryGoal,
      audience: normalize(task.audience ?? DEFAULT_TASK.audience)
    },
    signals: Array.isArray(payload?.signals) ? payload.signals.slice(0, 8) : []
  };
};

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "LLM endpoint missing",
        mix: DEFAULT_MIX,
        skin: DEFAULT_SKIN,
        task: DEFAULT_TASK,
        signals: ["未配置 OpenAI Key（Missing OpenAI config）"]
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt ?? "" }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return NextResponse.json(sanitize(parsed));
  } catch {
    return NextResponse.json(
      {
        error: "LLM parse failed",
        mix: DEFAULT_MIX,
        skin: DEFAULT_SKIN,
        task: DEFAULT_TASK,
        signals: ["解析失败，已回退默认值（Fallback）"]
      },
      { status: 500 }
    );
  }
}
