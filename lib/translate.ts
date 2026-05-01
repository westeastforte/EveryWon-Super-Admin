// Server-only Gemini translation helper. Used by /api/translate to turn
// Korean clinic names into natural English. We hit the REST endpoint
// directly to avoid pulling in @google/generative-ai (saves a dep and
// keeps the server bundle small). Requires GEMINI_API_KEY in env.

// Tried in order. If a model returns a retryable error (404 deprecated,
// 429 rate-limited, 5xx) we fall through to the next. Auth errors (400
// API_KEY_INVALID, 401, 403) abort immediately — switching models won't help.
const MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
] as const;
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface TranslateItem {
  nameKr: string;
  address?: string;
}

const SYSTEM_PROMPT = `You translate Korean medical clinic names into natural English for a patient-facing app aimed at foreign visitors in Korea.

Rules:
- Output ONLY the English name, no explanations, quotes, or punctuation around it.
- Preserve the clinic's branding: romanize proper nouns (e.g. "사랑의원" → "Sarang Clinic", not "Love Clinic"), translate generic medical descriptors (의원→Clinic, 병원→Hospital, 한의원→Korean Medicine Clinic, 치과→Dental Clinic, 안과→Eye Clinic, 피부과→Dermatology Clinic, 성형외과→Plastic Surgery Clinic, 정형외과→Orthopedic Clinic, 산부인과→OB-GYN Clinic, 소아과→Pediatric Clinic, 내과→Internal Medicine Clinic).
- Title Case the result.
- Drop trailing branch markers like "지점", "분원" unless they're part of the brand.
- If the name is already in English, return it unchanged.`;

const BATCH_PROMPT_HEADER = `Translate each Korean clinic name to English following the rules. Return a JSON array of strings, same order, same length as input. Output ONLY the JSON array — no markdown fences, no commentary.`;

// Status alone isn't enough: a 400 can be a transient INVALID_ARGUMENT
// (retry on next model) or API_KEY_INVALID (abort). Inspect the body.
const isAuthError = (status: number, body: string): boolean => {
  if (status === 401 || status === 403) return true;
  if (status === 400 && /API_KEY_INVALID|API key/i.test(body)) return true;
  return false;
};

const callGemini = async (prompt: string): Promise<string> => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY missing on server");

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: "text/plain",
    },
  });

  const errors: string[] = [];
  for (const model of MODELS) {
    const res = await fetch(`${endpointFor(model)}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text.trim();
      errors.push(`${model}: empty response`);
      continue;
    }

    const errBody = await res.text();
    const snippet = errBody.slice(0, 200);
    if (isAuthError(res.status, errBody)) {
      throw new Error(`Gemini ${res.status} (auth): ${snippet}`);
    }
    errors.push(`${model} ${res.status}: ${snippet}`);
  }

  throw new Error(`All Gemini models failed. ${errors.join(" | ")}`);
};

export const translateClinicName = async (
  item: TranslateItem,
): Promise<string> => {
  const ctx = item.address ? ` (address: ${item.address})` : "";
  const out = await callGemini(`Korean name: ${item.nameKr}${ctx}`);
  return out.replace(/^["']|["']$/g, "").trim();
};

const stripFences = (s: string): string =>
  s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

// Round-trip the API with a tiny known input to confirm the key is
// valid, the model is reachable, and the JSON shape matches what the
// caller expects. Used by the Settings "Test" button.
export const pingGemini = async (): Promise<{
  ok: boolean;
  sample?: string;
  error?: string;
}> => {
  if (!process.env.GEMINI_API_KEY) {
    return { ok: false, error: "GEMINI_API_KEY missing on server" };
  }
  try {
    const out = await translateClinicName({ nameKr: "강남이비인후과" });
    if (!out) return { ok: false, error: "empty response" };
    return { ok: true, sample: out };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

export const translateClinicNamesBatch = async (
  items: TranslateItem[],
): Promise<string[]> => {
  if (items.length === 0) return [];
  const list = items
    .map((it, i) => {
      const ctx = it.address ? ` | address: ${it.address}` : "";
      return `${i + 1}. ${it.nameKr}${ctx}`;
    })
    .join("\n");
  const raw = await callGemini(`${BATCH_PROMPT_HEADER}\n\n${list}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    throw new Error(`Gemini returned non-JSON: ${raw.slice(0, 200)}`);
  }
  if (!Array.isArray(parsed) || parsed.length !== items.length) {
    throw new Error(
      `Gemini batch length mismatch: expected ${items.length}, got ${
        Array.isArray(parsed) ? parsed.length : "not-an-array"
      }`,
    );
  }
  return parsed.map((v) => String(v ?? "").trim());
};
