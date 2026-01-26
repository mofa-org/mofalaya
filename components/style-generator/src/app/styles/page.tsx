"use client";

import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

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

const STORAGE_KEY = "style-generator-presets";
const STORAGE_CURRENT_KEY = "style-generator-current";

const STYLE_LABELS: Record<string, string> = {
  structure: "结构（Structure）",
  perception: "感知（Perception）",
  meaning: "意义（Meaning）",
  distribution: "传播（Distribution）"
};

const SKIN_LABELS: Record<string, string> = {
  sentenceLength: "句长（Sentence Length）",
  abstraction: "抽象度（Abstraction）",
  emotion: "情绪外显（Emotion）"
};

type Preset = {
  id: string;
  name: string;
  prompt: string;
  customPrompt: string;
  mix: typeof DEFAULT_MIX;
  skin: typeof DEFAULT_SKIN;
  task: typeof DEFAULT_TASK;
  createdAt: string;
};

const exportPresetFile = (preset: Preset) => {
  const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${preset.name || "style"}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function StyleBuilderPage() {
  const [prompt, setPrompt] = useState(
    "例如：新闻报道，结构清晰，强调事实与因果，避免夸张情绪，语言克制。"
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [mix, setMix] = useState(DEFAULT_MIX);
  const [skin, setSkin] = useState(DEFAULT_SKIN);
  const [task, setTask] = useState(DEFAULT_TASK);
  const [signals, setSignals] = useState<string[]>([]);
  const [previousMix, setPreviousMix] = useState(DEFAULT_MIX);
  const [previousSkin, setPreviousSkin] = useState(DEFAULT_SKIN);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch {
        setPresets([]);
      }
    }
  }, []);

  const persistPresets = (next: Preset[]) => {
    setPresets(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const persistCurrent = (next: {
    mix: typeof DEFAULT_MIX;
    skin: typeof DEFAULT_SKIN;
    task: typeof DEFAULT_TASK;
    customPrompt: string;
  }) => {
    window.localStorage.setItem(STORAGE_CURRENT_KEY, JSON.stringify(next));
  };

  const onGenerate = async () => {
    setError("");
    setPreviousMix(mix);
    setPreviousSkin(skin);
    setIsGenerating(true);
    try {
      const mergedPrompt = customPrompt.trim()
        ? `${prompt}\n\n补充要求（Custom Prompt）：\n${customPrompt}`
        : prompt;
      const response = await fetch("/api/style/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: mergedPrompt })
      });
      if (!response.ok) {
        throw new Error("参数生成失败");
      }
      const result = await response.json();
      setMix(result.mix ?? DEFAULT_MIX);
      setSkin(result.skin ?? DEFAULT_SKIN);
      setTask(result.task ?? DEFAULT_TASK);
      setSignals(result.signals ?? []);
      persistCurrent({
        mix: result.mix ?? DEFAULT_MIX,
        skin: result.skin ?? DEFAULT_SKIN,
        task: result.task ?? DEFAULT_TASK,
        customPrompt
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "参数生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const onSavePreset = () => {
    const fallbackName = `Style ${new Date().toISOString().slice(0, 10)}`;
    const name = presetName.trim() || fallbackName;
    const preset: Preset = {
      id: `${Date.now()}`,
      name,
      prompt,
      customPrompt,
      mix,
      skin,
      task,
      createdAt: new Date().toISOString()
    };
    persistPresets([preset, ...presets]);
    exportPresetFile(preset);
    setPresetName("");
  };

  const onLoadPreset = (preset: Preset) => {
    setPrompt(preset.prompt);
    setCustomPrompt(preset.customPrompt ?? "");
    setMix(preset.mix);
    setSkin(preset.skin);
    setTask(preset.task);
    setSignals([`已载入：${preset.name}（Loaded）`]);
    persistCurrent({
      mix: preset.mix,
      skin: preset.skin,
      task: preset.task,
      customPrompt: preset.customPrompt ?? ""
    });
  };

  const onDeletePreset = (id: string) => {
    persistPresets(presets.filter((item) => item.id !== id));
  };

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const preset = JSON.parse(text) as Preset;
      if (!preset?.name || !preset?.mix || !preset?.skin) return;
      const normalized: Preset = {
        ...preset,
        customPrompt: preset.customPrompt ?? "",
        prompt: preset.prompt ?? "",
        createdAt: preset.createdAt ?? new Date().toISOString(),
        id: preset.id ?? `${Date.now()}`
      };
      persistPresets([normalized, ...presets]);
      onLoadPreset(normalized);
    } catch {
      return;
    }
  };

  const deltas = useMemo(() => {
    const mixDelta = Object.keys(mix).reduce<Record<string, number>>((acc, key) => {
      acc[key] = mix[key as keyof typeof mix] - previousMix[key as keyof typeof mix];
      return acc;
    }, {});
    const skinDelta = Object.keys(skin).reduce<Record<string, number>>((acc, key) => {
      acc[key] = skin[key as keyof typeof skin] - previousSkin[key as keyof typeof skin];
      return acc;
    }, {});
    return { mixDelta, skinDelta };
  }, [mix, skin, previousMix, previousSkin]);

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        {
          prompt,
          customPrompt,
          task,
          mix,
          skin
        },
        null,
        2
      ),
    [prompt, task, mix, skin]
  );

  return (
    <main className="page-shell">
      <div className="topbar">
        <div className="brand">
          <div className="brand-title">风格生成与配置（Style Builder）</div>
          <div className="brand-sub">Prompt 到参数（Prompt-to-Params）</div>
        </div>

        <div className="tabs">
          <Link className="tab" href="/">
            返回编曲台（Back to Console）
          </Link>
        </div>
      </div>

      <div className="columns config-columns">
        <div>
          <div className="card motion-in">
            <div className="section-title">Prompt 输入（Prompt Input）</div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="输入风格描述或需求..."
            />
            <div className="section-title" style={{ marginTop: 12 }}>
              自定义补充（Custom Prompt）
            </div>
            <textarea
              value={customPrompt}
              onChange={(event) => setCustomPrompt(event.target.value)}
              placeholder="任何额外要求、风格偏好、约束或提示..."
            />
            <div className="inline-actions">
              <button className="action-btn" onClick={onGenerate}>
                {isGenerating ? "生成中（Generating）" : "生成参数（Generate）"}
              </button>
              <input
                className="input-text"
                placeholder="存档名称（Preset Name）"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
              <button className="ghost-btn" onClick={onSavePreset}>
                保存并导出（Save to Disk）
              </button>
              <label className="ghost-btn" style={{ cursor: "pointer" }}>
                导入（Import）
                <input type="file" accept="application/json" hidden onChange={onImportFile} />
              </label>
            </div>
            <div className="hint">
              生成会覆盖当前参数，并在下方可视化变化。保存将写入本地存储并导出 JSON。
            </div>
            {error ? <div className="error-text">{error}</div> : null}
          </div>

          <div className="card motion-in">
            <div className="section-title">解析提示（Signals）</div>
            {signals.length ? (
              <ul className="ul">
                {signals.map((signal) => (
                  <li key={signal} className="li">
                    {signal}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">暂无解析结果，请先生成。</div>
            )}
          </div>

          <div className="card motion-in">
            <div className="section-title">导出配置（Export Payload）</div>
            <pre className="output small">{exportPayload}</pre>
          </div>
        </div>

        <div>
          <div className="card motion-in">
            <div className="section-title">参数变化可视化（Visualize Changes）</div>
            <div className="meter-grid">
              {Object.entries(mix).map(([key, value]) => (
                <div key={key} className="meter">
                  <div className="meter-head">
                    <span>{STYLE_LABELS[key]}</span>
                    <span className="meter-values">
                      <span className="meter-number">{value}</span>
                      <span className="delta">
                      {deltas.mixDelta[key] >= 0 ? "+" : ""}
                      {deltas.mixDelta[key]}
                      </span>
                    </span>
                  </div>
                  <div className="meter-bar">
                    <div
                      className="meter-fill accent"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
              {Object.entries(skin).map(([key, value]) => (
                <div key={key} className="meter">
                  <div className="meter-head">
                    <span>{SKIN_LABELS[key]}</span>
                    <span className="meter-values">
                      <span className="meter-number">{value}</span>
                      <span className="delta">
                      {deltas.skinDelta[key] >= 0 ? "+" : ""}
                      {deltas.skinDelta[key]}
                      </span>
                    </span>
                  </div>
                  <div className="meter-bar">
                    <div
                      className="meter-fill teal"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card motion-in">
            <div className="section-title">当前任务参数（Task Params）</div>
            <div className="timeline">
              <div className="timeline-item">
                内容类型：{task.contentType}
              </div>
              <div className="timeline-item">
                主要目标：{task.primaryGoal}
              </div>
              <div className="timeline-item">
                受众：{task.audience}
              </div>
            </div>
          </div>

          <div className="card motion-in">
            <div className="section-title">本地存档（Saved Presets）</div>
            {presets.length ? (
              <div className="preset-list">
                {presets.map((preset) => (
                  <div key={preset.id} className="preset-card">
                    <div>
                      <div className="preset-title">{preset.name}</div>
                      <div className="hint">{preset.prompt}</div>
                    </div>
                    <div className="preset-actions">
                      <button className="ghost-btn" onClick={() => onLoadPreset(preset)}>
                        载入（Load）
                      </button>
                      <button className="ghost-btn" onClick={() => exportPresetFile(preset)}>
                        导出（Export）
                      </button>
                      <button className="ghost-btn" onClick={() => onDeletePreset(preset.id)}>
                        删除（Delete）
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">暂无存档，保存后会出现在这里。</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
