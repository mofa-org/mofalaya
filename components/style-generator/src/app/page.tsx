"use client";

import { type ChangeEvent, Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { remixText } from "@/lib/remix";

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

const STYLE_LABELS: Record<string, string> = {
  structure: "结构（Structure）",
  perception: "感知（Perception）",
  meaning: "意义（Meaning）",
  distribution: "传播（Distribution）"
};

const ROLE_LABELS: Record<string, string> = {
  opening: "开场（Opening）",
  development: "展开（Development）",
  turn: "转折（Turn）",
  closing: "结尾（Closing）"
};

const STORAGE_CURRENT_KEY = "style-generator-current";
const STORAGE_PRESETS_KEY = "style-generator-presets";

type Preset = {
  id: string;
  name: string;
  prompt: string;
  customPrompt?: string;
  mix: typeof DEFAULT_MIX;
  skin: typeof DEFAULT_SKIN;
  task: typeof DEFAULT_TASK;
  createdAt: string;
};

const computeAllocations = ({
  mix,
  task,
  count
}: {
  mix: typeof DEFAULT_MIX;
  task: typeof DEFAULT_TASK;
  count: number;
}) => {
  const roles = assignRoles(count);
  const base = normalizeMix(mix);

  const roleBias = (role: string) => {
    const weights = { ...base } as Record<string, number>;
    const bump = (key: string, value: number) => {
      weights[key] = clamp(weights[key] + value, 0, 1);
    };

    if (task.contentType === "news") {
      bump("structure", 0.07);
      bump("distribution", -0.05);
    } else if (task.contentType === "novel") {
      bump("perception", 0.07);
      bump("structure", -0.03);
    } else if (task.contentType === "audio") {
      bump("distribution", 0.08);
    }

    if (role === "opening") {
      bump("structure", 0.06);
      bump("distribution", 0.03);
    } else if (role === "development") {
      bump("perception", 0.05);
    } else if (role === "turn") {
      bump("meaning", 0.08);
    } else if (role === "closing") {
      bump("meaning", 0.05);
      bump("distribution", 0.02);
    }

    const sum =
      weights.structure +
      weights.perception +
      weights.meaning +
      weights.distribution ||
      1;

    return {
      structure: weights.structure / sum,
      perception: weights.perception / sum,
      meaning: weights.meaning / sum,
      distribution: weights.distribution / sum
    };
  };

  return roles.map((role) => {
    const scores = roleBias(role);
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [primary, secondary] = [sorted[0][0], sorted[1][0]];
    const warning =
      sorted[2][1] > 0.28 ? "出现第三种风格竞争（Third style competing）" : null;
    return {
      role,
      primary,
      secondary,
      scores,
      warning
    };
  });
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const normalizeMix = (mix: Record<string, number>) => {
  const total = Object.values(mix).reduce((acc, value) => acc + value, 0) || 1;
  return Object.fromEntries(
    Object.entries(mix).map(([key, value]) => [key, value / total])
  ) as Record<string, number>;
};

const splitParagraphs = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (/\n\s*\n/.test(trimmed)) {
    return trimmed
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return trimmed
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const splitSentences = (text: string) => {
  const matches = text.match(/[^。！？!?]+[。！？!?]?/g);
  return matches ? matches.map((item) => item.trim()).filter(Boolean) : [];
};

const assignRoles = (count: number) => {
  if (count <= 1) return ["opening"];
  if (count === 2) return ["opening", "closing"];
  if (count === 3) return ["opening", "turn", "closing"];
  const roles = new Array(count).fill("development");
  roles[0] = "opening";
  roles[count - 1] = "closing";
  roles[Math.floor(count / 2)] = "turn";
  return roles;
};

const getLanguageHints = (skin: typeof DEFAULT_SKIN) => {
  const sentence =
    skin.sentenceLength < 40
      ? "短（Short）"
      : skin.sentenceLength > 70
      ? "长（Long）"
      : "混合（Mixed）";
  const abstraction =
    skin.abstraction < 40
      ? "更具体（Concrete）"
      : skin.abstraction > 70
      ? "更抽象（Abstract）"
      : "适中（Balanced）";
  const emotion =
    skin.emotion < 40
      ? "更克制（Restrained）"
      : skin.emotion > 70
      ? "更外放（Expressive）"
      : "中性（Neutral）";

  return `语言皮肤（Skin）：${sentence}句为主，${abstraction}细节，${emotion}情绪。`;
};

const runRemixEngine = ({
  rawText,
  facts,
  mix,
  skin,
  task
}: {
  rawText: string;
  facts: string[];
  mix: typeof DEFAULT_MIX;
  skin: typeof DEFAULT_SKIN;
  task: typeof DEFAULT_TASK;
}) => {
  const paragraphs = splitParagraphs(rawText);
  const allocations = computeAllocations({
    mix,
    task,
    count: paragraphs.length || 1
  });

  const canonical = paragraphs.map((para) => `- ${para}`).join("\n");

  const structurePlan = allocations
    .map((item, index) => {
      const roleLabel = ROLE_LABELS[item.role] ?? item.role;
      const primaryLabel = STYLE_LABELS[item.primary] ?? item.primary;
      const secondaryLabel = STYLE_LABELS[item.secondary] ?? item.secondary;
      return `P${index + 1}: ${roleLabel} -> ${primaryLabel} + ${secondaryLabel}`;
    })
    .join("\n");

  const finalText = remixText({ text: rawText, mix, skin, task });

  const factLock = facts.length
    ? `\n\n事实锁定（Fact Lock）：\n- ${facts.join("\n- ")}`
    : "";

  return {
    canonical,
    structurePlan,
    final: `${finalText}\n\n${getLanguageHints(skin)}${factLock}`,
    allocations
  };
};

const Slider = ({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) => (
  <div className="slider">
    <div className="slider-header">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input
      className="range"
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    {hint ? <div className="hint">{hint}</div> : null}
  </div>
);

const Pill = ({ text }: { text: string }) => <span className="pill">{text}</span>;

const Heatmap = ({
  allocations,
  unitLabel = "S"
}: {
  allocations: Array<{
    role: string;
    scores: Record<string, number>;
  }>;
  unitLabel?: string;
}) => {
  if (!allocations.length) return null;
  const rows = [
    { key: "structure", label: "结构（Structure）" },
    { key: "perception", label: "感知（Perception）" },
    { key: "meaning", label: "意义（Meaning）" },
    { key: "distribution", label: "传播（Distribution）" }
  ];
  const cols = allocations.map((_, index) => `${unitLabel}${index + 1}`);

  return (
    <div>
      <div className="section-title">风格热力图（Style Heatmap）</div>
      <div
        className="heatmap"
        style={{
          gridTemplateColumns: `80px repeat(${cols.length}, 18px)`
        }}
      >
        <div />
        {cols.map((col) => (
          <div key={col} className="hint" style={{ textAlign: "center" }}>
            {col}
          </div>
        ))}
        {rows.map((row) => (
          <Fragment key={row.key}>
            <div className="hint">{row.label}</div>
            {allocations.map((allocation, idx) => {
              const value = allocation.scores[row.key];
              const alpha = clamp(value, 0, 1);
              return (
                <div
                  key={`${row.key}-${idx}`}
                  className="heat-cell"
                  style={{
                    background: `rgba(12, 16, 22, ${0.08 + 0.6 * alpha})`
                  }}
                  title={`${row.label}: ${(value * 100).toFixed(0)}%`}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default function Page() {
  const [rawText, setRawText] = useState(
    "把原文粘贴在这里。用空行分段。"
  );
  const [factsText, setFactsText] = useState(
    "不允许改动的事实1\n不允许改动的事实2"
  );
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [skin, setSkin] = useState(DEFAULT_SKIN);
  const [task, setTask] = useState(DEFAULT_TASK);
  const [customPrompt, setCustomPrompt] = useState("");
  const [loadedFromBuilder, setLoadedFromBuilder] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("");

  const [activeView, setActiveView] = useState("final");
  const [runResult, setRunResult] = useState<ReturnType<typeof runRemixEngine> | null>(
    null
  );
  const [prevFinal, setPrevFinal] = useState("");
  const [llmStatus, setLlmStatus] = useState<"idle" | "loading" | "ok" | "fallback">(
    "idle"
  );
  const [llmPrompt, setLlmPrompt] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_CURRENT_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.mix) setMix(parsed.mix);
      if (parsed?.skin) setSkin(parsed.skin);
      if (parsed?.task) setTask(parsed.task);
      if (parsed?.customPrompt) setCustomPrompt(parsed.customPrompt);
      setLoadedFromBuilder(true);
    } catch {
      setLoadedFromBuilder(false);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_PRESETS_KEY);
    if (!stored) return;
    try {
      setPresets(JSON.parse(stored));
    } catch {
      setPresets([]);
    }
  }, []);

  const applyPreset = (preset: Preset) => {
    setMix(preset.mix);
    setSkin(preset.skin);
    setTask(preset.task);
    setCustomPrompt(preset.customPrompt ?? "");
    setLoadedFromBuilder(true);
    window.localStorage.setItem(
      STORAGE_CURRENT_KEY,
      JSON.stringify({
        mix: preset.mix,
        skin: preset.skin,
        task: preset.task,
        customPrompt: preset.customPrompt ?? ""
      })
    );
  };

  const onSelectPreset = (id: string) => {
    setSelectedPreset(id);
    const preset = presets.find((item) => item.id === id);
    if (preset) applyPreset(preset);
  };

  const onImportPreset = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as Preset;
      if (!parsed?.name || !parsed?.mix || !parsed?.skin) return;
      const next = [parsed, ...presets];
      setPresets(next);
      window.localStorage.setItem(STORAGE_PRESETS_KEY, JSON.stringify(next));
      setSelectedPreset(parsed.id);
      applyPreset(parsed);
    } catch {
      return;
    }
  };

  const facts = useMemo(
    () =>
      factsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [factsText]
  );

  const topStyles = useMemo(() => {
    const normalized = normalizeMix(mix);
    return Object.entries(normalized)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([key]) => STYLE_LABELS[key] ?? key);
  }, [mix]);

  const onRun = async () => {
    setPrevFinal(runResult?.final ?? "");
    const localResult = runRemixEngine({ rawText, facts, mix, skin, task });
    setRunResult(localResult);
    setActiveView("final");
    setLlmStatus("loading");
    setLlmPrompt("");
    try {
      const response = await fetch("/api/remix/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, facts, mix, skin, task, customPrompt })
      });
      if (!response.ok) {
        throw new Error("LLM remix failed");
      }
      const data = await response.json();
      setLlmPrompt(data?.prompt ?? "");
      setRunResult({
        ...localResult,
        final: data?.final ? `${data.final}\n\n${getLanguageHints(skin)}` : localResult.final
      });
      setLlmStatus(data?.final ? "ok" : "fallback");
    } catch {
      setLlmStatus("fallback");
    }
  };

  const heatmapAllocations = useMemo(() => {
    const sentences = splitSentences(rawText);
    if (!sentences.length) return [];
    return computeAllocations({ mix, task, count: sentences.length });
  }, [rawText, mix, task]);

  const warnings = useMemo(() => {
    if (!heatmapAllocations.length) return [];
    return heatmapAllocations
      .map((allocation, index) =>
        allocation.warning ? `S${index + 1}: ${allocation.warning}` : null
      )
      .filter(Boolean) as string[];
  }, [heatmapAllocations]);

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          task,
          mix,
          skin,
          constraints: {
            max_styles_per_paragraph: 2,
            fact_lock: true,
            no_explicit_imitation: true,
            no_preachy: true
          }
        },
        null,
        2
      ),
    [task, mix, skin]
  );

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-title">风格引擎（Remix Engine）</div>
          <div className="brand-sub">风格编曲台（Style Orchestration）</div>
        </div>

        <div className="tabs">
          {[
            { id: "final", label: "成稿（Final）" },
            { id: "stages", label: "阶段（Stages）" },
            { id: "diff", label: "对比（Diff）" }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeView === tab.id ? "active" : ""}`}
              onClick={() => setActiveView(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          <Link className="tab" href="/styles">
            风格配置（Style Builder）
          </Link>
        </div>

      </div>

      <div className="columns">
        <div>
          <div className="card motion-in">
            <div className="section-title">内容与任务（Content & Task）</div>
            <div className="field-row">
              <label className="label">内容类型（Content Type）</label>
              <select
                value={task.contentType}
                onChange={(event) =>
                  setTask((current) => ({
                    ...current,
                    contentType: event.target.value
                  }))
                }
              >
                <option value="news">新闻（News）</option>
                <option value="novel">小说（Novel）</option>
                <option value="nonfiction">纪实（Nonfiction）</option>
                <option value="commentary">评论（Commentary）</option>
                <option value="audio">音频稿（Audio Script）</option>
              </select>
            </div>
            <div className="field-row">
              <label className="label">主要目标（Primary Goal）</label>
              <select
                value={task.primaryGoal}
                onChange={(event) =>
                  setTask((current) => ({
                    ...current,
                    primaryGoal: event.target.value
                  }))
                }
              >
                <option value="clarity">讲清楚（Clarity）</option>
                <option value="moving">打动人（Moving）</option>
                <option value="thinking">引发思考（Thinking）</option>
                <option value="viral">易传播（Viral）</option>
                <option value="long_value">长期价值（Long-term Value）</option>
              </select>
            </div>
            <Slider
              label="受众（Expert → General）"
              value={task.audience}
              onChange={(value) =>
                setTask((current) => ({ ...current, audience: value }))
              }
              hint="数值越高越偏向大众表达与更低密度。"
            />
          </div>

          <div className="card motion-in">
            <div className="section-title">风格选择（Style Profiles）</div>
            <div className="field-row">
              <label className="label">载入配置（Load）</label>
              <select
                value={selectedPreset}
                onChange={(event) => onSelectPreset(event.target.value)}
              >
                <option value="">选择一个存档...</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-actions">
              <label className="ghost-btn" style={{ cursor: "pointer" }}>
                从磁盘导入（Import）
                <input type="file" accept="application/json" hidden onChange={onImportPreset} />
              </label>
              <Link className="ghost-btn" href="/styles">
                去风格配置页（Builder）
              </Link>
            </div>
            <div className="hint">
              这里读取的是本地存储的风格存档，导入可加载磁盘 JSON。
            </div>
          </div>

          <div className="card motion-in">
            <div className="section-title">自定义补充（Custom Prompt）</div>
            <textarea
              value={customPrompt || "（未设置）"}
              readOnly
              style={{ minHeight: 120 }}
            />
            <div className="hint">
              来自风格配置页（Style Builder）的补充提示，已用于 LLM Remix。
            </div>
          </div>

          <div className="card motion-in">
            <div className="section-title">事实锁定（Fact Lock）</div>
            <textarea
              value={factsText}
              onChange={(event) => setFactsText(event.target.value)}
            />
            <div className="hint">
              事实不可改动。将该列表传给后端用于 Canonical 校验。
            </div>
          </div>
        </div>

        <div>
          <div className="card motion-in">
            <div className="section-title">原文输入（Raw Input）</div>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="粘贴原文..."
            />
          </div>

          <div className="card motion-in">
            <div className="center-header">
              <div>
                <div className="section-title">输出预览（Output Preview）</div>
                <div className="badges">
                  <Pill text={`主导风格（Top Styles）：${topStyles.join(" + ")}`} />
                  {warnings.length ? (
                    <Pill text={`提示（Warnings）：${warnings.length}`} />
                  ) : null}
                  {loadedFromBuilder ? (
                    <Pill text="已载入风格配置（Loaded from Builder）" />
                  ) : null}
                  {llmStatus === "ok" ? (
                    <Pill text="LLM 已生成（LLM Ready）" />
                  ) : null}
                  {llmStatus === "fallback" ? (
                    <Pill text="LLM 失败，已降级（Fallback）" />
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {runResult ? (
                  <button className="action-btn" onClick={onRun}>
                    再次编曲（Run Again）
                  </button>
                ) : null}
                <div className="pill" style={{ borderColor: "transparent" }}>
                  LLM + 本地规划（LLM + Local Plan）
                </div>
              </div>
            </div>

            {!runResult ? (
              <div style={{ padding: "6px 0" }}>
                <button className="action-btn" onClick={onRun}>
                  运行编曲（Run Remix）
                </button>
              </div>
            ) : (
              <div className="timeline">
                {activeView === "final" && (
                  <pre className="output">{runResult.final}</pre>
                )}

                {activeView === "stages" && (
                  <>
                    <div>
                      <div className="section-title">阶段 0：去风格底稿（Canonical）</div>
                      <pre className="output small">{runResult.canonical}</pre>
                    </div>
                    <div>
                      <div className="section-title">阶段 1：结构规划（Structure Plan）</div>
                      <pre className="output small">{runResult.structurePlan}</pre>
                    </div>
                    <div>
                      <div className="section-title">LLM Prompt（调试）</div>
                      <pre className="output small">
                        {llmPrompt || "尚未生成（Not Generated）"}
                      </pre>
                    </div>
                  </>
                )}

                {activeView === "diff" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div className="section-title">上一次（Previous）</div>
                      <pre className="output small">{prevFinal || "（空）"}</pre>
                    </div>
                    <div>
                      <div className="section-title">当前（Current）</div>
                      <pre className="output small">{runResult.final}</pre>
                    </div>
                  </div>
                )}

                {warnings.length ? (
                  <div>
                    <div className="section-title">诊断提示（Diagnostics）</div>
                    <ul className="ul">
                      {warnings.map((warning) => (
                        <li key={warning} className="li">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            <Heatmap allocations={heatmapAllocations} unitLabel="S" />
          </div>
        </div>

        <div>
          <div className="card motion-in">
            <div className="section-title">风格混音（Style Mixer）</div>
            <Slider
              label="结构（Structure）"
              value={mix.structure}
              onChange={(value) => setMix((current) => ({ ...current, structure: value }))}
              hint="因果清晰、时间线、事实骨架。"
            />
            <Slider
              label="感知（Perception）"
              value={mix.perception}
              onChange={(value) => setMix((current) => ({ ...current, perception: value }))}
              hint="感官细节、场景密度、人物经验。"
            />
            <Slider
              label="意义（Meaning）"
              value={mix.meaning}
              onChange={(value) => setMix((current) => ({ ...current, meaning: value }))}
              hint="隐含命题、价值取向、反思。"
            />
            <Slider
              label="传播（Distribution）"
              value={mix.distribution}
              onChange={(value) =>
                setMix((current) => ({ ...current, distribution: value }))
              }
              hint="Hook、节奏、记忆点。"
            />
          </div>

          <div className="card motion-in">
            <div className="section-title">语言皮肤（Language Skin）</div>
            <Slider
              label="句长（Sentence Length）"
              value={skin.sentenceLength}
              onChange={(value) =>
                setSkin((current) => ({ ...current, sentenceLength: value }))
              }
              hint="只在最后的语言统一阶段生效。"
            />
            <Slider
              label="抽象度（Abstraction）"
              value={skin.abstraction}
              onChange={(value) => setSkin((current) => ({ ...current, abstraction: value }))}
              hint="具体与抽象的表达偏好。"
            />
            <Slider
              label="情绪外显（Emotion）"
              value={skin.emotion}
              onChange={(value) => setSkin((current) => ({ ...current, emotion: value }))}
              hint="克制与外放的情绪表达。"
            />
          </div>

          <div className="card motion-in">
            <div className="section-title">导出配置（Export Payload）</div>
            <pre className="output small">{exportPayload}</pre>
            <div className="hint">
              将这段 JSON 与 rawText、facts 一起发给后端。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
