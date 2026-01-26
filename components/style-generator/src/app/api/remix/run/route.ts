import { NextResponse } from "next/server";

const systemPrompt = `你是一个“风格编曲（Style Orchestration）”写作引擎。\n你的任务是将输入内容按给定风格参数进行Remix。\n\n硬性规则：\n- 不改动事实（Fact Lock）\n- 单段最多2种风格主导\n- 不出现风格说明或来源\n- 不显性模仿任何作者\n- 输出为完整成稿文本，仅输出正文\n\n风格维度说明：\n- Structure: 结构与因果清晰度\n- Perception: 感官细节与场景\n- Meaning: 意义与命题\n- Distribution: 传播性与记忆点\n\n语言皮肤说明：\n- Sentence Length: 句长偏好\n- Abstraction: 抽象度\n- Emotion: 情绪外显度`;

const buildUserPrompt = (input: {
  rawText: string;
  facts: string[];
  mix: Record<string, number>;
  skin: Record<string, number>;
  task: Record<string, unknown>;
  customPrompt?: string;
}) => {
  const factLock = input.facts.length
    ? `\n\nFact Lock:\n- ${input.facts.join("\n- ")}`
    : "";
  const custom = input.customPrompt?.trim()
    ? `\n\n自定义补充（Custom Prompt）：\n${input.customPrompt.trim()}`
    : "";

  return `任务：对以下内容进行Remix\n\n内容：\n"""\n${input.rawText}\n"""\n\n风格参数（0-100）：\n- Structure: ${input.mix.structure}\n- Perception: ${input.mix.perception}\n- Meaning: ${input.mix.meaning}\n- Distribution: ${input.mix.distribution}\n\n语言皮肤（0-100）：\n- Sentence Length: ${input.skin.sentenceLength}\n- Abstraction: ${input.skin.abstraction}\n- Emotion: ${input.skin.emotion}\n\n任务配置：\n${JSON.stringify(input.task)}${custom}${factLock}`;
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OpenAI config" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
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
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(body) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ final: content ?? "", prompt: buildUserPrompt(body) });
  } catch {
    return NextResponse.json({ error: "LLM remix failed" }, { status: 500 });
  }
}
