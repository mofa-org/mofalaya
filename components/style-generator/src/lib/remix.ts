export type StyleMix = {
  structure: number;
  perception: number;
  meaning: number;
  distribution: number;
};

export type LanguageSkin = {
  sentenceLength: number;
  abstraction: number;
  emotion: number;
};

export type TaskMeta = {
  contentType: string;
  primaryGoal: string;
  audience: number;
};

type Allocation = {
  role: string;
  primary: keyof StyleMix;
  secondary: keyof StyleMix;
  scores: Record<keyof StyleMix, number>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

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
  return matches ? matches.map((item) => item.trim()).filter(Boolean) : [text];
};

const normalizeMix = (mix: StyleMix) => {
  const total = Object.values(mix).reduce((acc, value) => acc + value, 0) || 1;
  return {
    structure: mix.structure / total,
    perception: mix.perception / total,
    meaning: mix.meaning / total,
    distribution: mix.distribution / total
  } as Record<keyof StyleMix, number>;
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

const computeAllocations = (
  mix: StyleMix,
  count: number,
  task?: TaskMeta
): Allocation[] => {
  const base = normalizeMix(mix);
  const roles = assignRoles(count);

  const roleBias = (role: string) => {
    const weights = { ...base } as Record<keyof StyleMix, number>;
    const bump = (key: keyof StyleMix, value: number) => {
      weights[key] = clamp(weights[key] + value, 0, 1);
    };

    if (task?.contentType === "news") {
      bump("structure", 0.06);
      bump("distribution", -0.04);
    } else if (task?.contentType === "novel") {
      bump("perception", 0.06);
      bump("structure", -0.03);
    } else if (task?.contentType === "audio") {
      bump("distribution", 0.06);
    }

    if (role === "opening") {
      bump("structure", 0.05);
      bump("distribution", 0.03);
    } else if (role === "development") {
      bump("perception", 0.04);
    } else if (role === "turn") {
      bump("meaning", 0.07);
    } else if (role === "closing") {
      bump("meaning", 0.05);
      bump("distribution", 0.02);
    }

    const sum =
      weights.structure + weights.perception + weights.meaning + weights.distribution || 1;

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
    const [primary, secondary] = [sorted[0][0], sorted[1][0]] as Array<keyof StyleMix>;
    return {
      role,
      primary,
      secondary,
      scores
    };
  });
};

const addConnector = (sentence: string, connector: string) => {
  const trimmed = sentence.trim();
  if (/^(首先|接着|随后|同时|另外|最后|最终|因此)/.test(trimmed)) return trimmed;
  return `${connector}，${trimmed}`;
};

const applyStructure = (sentences: string[]) => {
  if (sentences.length === 0) return sentences;
  const connectors = ["首先", "接着", "随后", "最后"];
  return sentences.map((sentence, index) => {
    if (index === 0) return addConnector(sentence, connectors[0]);
    if (index === 1 && sentences.length > 2) return addConnector(sentence, connectors[1]);
    if (index === sentences.length - 1 && sentences.length > 2)
      return addConnector(sentence, connectors[3]);
    return sentence;
  });
};

const applyPerception = (sentences: string[]) => {
  if (!sentences.length) return sentences;
  if (/^在(画面|场景|细节)/.test(sentences[0])) return sentences;
  sentences[0] = `在画面上，${sentences[0]}`;
  return sentences;
};

const applyMeaning = (sentences: string[]) => {
  const reflection = "这也提示了其中的意义走向。";
  return [...sentences, reflection];
};

const applyDistribution = (paragraph: string) => {
  const cleaned = paragraph.replace(/[。！？!?]/g, "").trim();
  if (!cleaned) return paragraph;
  const snippet = cleaned.slice(0, 24);
  return `${paragraph}\n一句话：${snippet}。`;
};

const applyLanguageSkin = (paragraph: string, skin: LanguageSkin) => {
  let text = paragraph;

  if (skin.abstraction < 40 && !text.startsWith("具体来说")) {
    text = `具体来说，${text}`;
  }
  if (skin.abstraction > 70 && !text.startsWith("从更抽象的层面看")) {
    text = `从更抽象的层面看，${text}`;
  }

  if (skin.sentenceLength < 40) {
    let replaced = 0;
    text = text.replace(/，/g, (match) => {
      if (replaced < 2) {
        replaced += 1;
        return "。";
      }
      return match;
    });
  }

  if (skin.sentenceLength > 70) {
    let replaced = 0;
    text = text.replace(/。/g, (match) => {
      if (replaced < 2) {
        replaced += 1;
        return "，";
      }
      return match;
    });
  }

  if (skin.emotion < 40) {
    text = text.replace(/！/g, "。");
  }
  if (skin.emotion > 70) {
    text = text.replace(/。$/, "！");
  }

  return text;
};

const applyStyles = (
  paragraph: string,
  allocation: Allocation,
  skin: LanguageSkin
) => {
  let sentences = splitSentences(paragraph);

  const active = new Set([allocation.primary, allocation.secondary]);
  if (active.has("structure")) {
    sentences = applyStructure(sentences);
  }
  if (active.has("perception")) {
    sentences = applyPerception(sentences);
  }
  if (active.has("meaning")) {
    sentences = applyMeaning(sentences);
  }

  let merged = sentences.join("");

  if (active.has("distribution")) {
    merged = applyDistribution(merged);
  }

  return applyLanguageSkin(merged, skin);
};

export const remixText = ({
  text,
  mix,
  skin,
  task
}: {
  text: string;
  mix: StyleMix;
  skin: LanguageSkin;
  task?: TaskMeta;
}) => {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return "";

  const roles = assignRoles(paragraphs.length);
  const allocations = computeAllocations(mix, paragraphs.length, task);

  const remixed = paragraphs.map((paragraph, index) => {
    const allocation = allocations[index % allocations.length];
    return applyStyles(paragraph, { ...allocation, role: roles[index] }, skin);
  });

  return remixed.join("\n\n");
};
