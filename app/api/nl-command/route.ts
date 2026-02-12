import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { AiIntent, AiIntentResult, AiRiskLevel, ShiftFilter } from "@/lib/ops/ai-intent";

const MIN_API_KEY_LENGTH = 20;
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "exaone3.5:7.8b";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
const AI_PROVIDER = (process.env.AI_PROVIDER || "").toLowerCase();
const AI_DUAL_REVIEW_ENABLED = process.env.AI_DUAL_REVIEW_ENABLED !== "0";
const AI_PROVIDER_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 9000);
const MAX_ACTIVITY_CONTEXT = Number(process.env.AI_MAX_ACTIVITY_CONTEXT || 48);
const OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS || "llama3.1:8b")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => x.length > 0 && x !== DEFAULT_OLLAMA_MODEL);
const OLLAMA_REVIEW_MODEL =
  (process.env.OLLAMA_REVIEW_MODEL || OLLAMA_FALLBACK_MODELS[0] || "").trim() || null;

// TR Logistics Domain Prompt
const SYSTEM_PROMPT = `You are an AI assistant for a Transformer (TR) logistics scheduling system.

# Project Context
- 7 Voyages transporting 7 TR Units from AGI Site to Mina Zayed Port
- 1 SPMT (Self-Propelled Modular Transporter) operates
- Key Activities: Load-out, Sea Transit (Sail-away), Load-in, Land Transport, Jack-down
- Constraints: PTW (Permit to Work), CERT (Certification), Weather windows, Resource availability

# Your Task
Parse user's natural language command into structured schedule modification parameters.

# Input Format
- User query (e.g., "Move all Voyage 3 activities forward by 5 days but keep PTW windows")
- Current activities JSON array (activity_id, activity_name, voyage_id, tr_unit_id, anchor_type, planned_start, planned_finish, constraints)

# Output Format (JSON only, no markdown)
{
  "intent": "shift_activities" | "prepare_bulk" | "explain_conflict" | "explain_why" | "navigate_query" | "set_mode" | "apply_preview" | "unclear",
  "explanation": "Human-readable explanation of what you understood",
  "parameters": {
    "filter": {
      "voyage_ids": ["V3"],
      "tr_unit_ids": ["TR-3"],
      "anchor_types": ["LOADOUT"],
      "activity_ids": ["A-300-LOADOUT"]
    },
    "action": {
      "type": "shift_days",
      "delta_days": 5,
      "preserve_constraints": ["PTW"]
    }
  }
  "confidence": 0.0-1.0,
  "risk_level": "low" | "medium" | "high",
  "requires_confirmation": true,
  "ambiguity": null | {
    "question": "Did you mean Voyage 3 or Activity A-300-LOADOUT?",
    "options": ["voyage_3", "activity_a300"]
  },
  "affected_activities": ["A-300-LOADOUT", "A-310-SEA_TRANSIT", ...]
}

# Key Rules
1. **Voyage X** = all activities with voyage_id "VX" or tr_unit_id "TR-X"
2. **Load-out / Jack-down / Sea Transit** = activities with matching anchor_type
3. **forward** = negative delta (advance), **back/delay** = positive delta
4. **keep/preserve constraints** = preserve_constraints: ["PTW", "CERT", "WEATHER"]
5. If ambiguous, set intent="unclear" and provide clarification question
6. apply_preview must always set parameters.preview_ref = "current"
7. set_mode must use one of: live, history, approval, compare
8. explain_why: User asks "Why is this delayed/blocked?" about a selected activity. Return intent="explain_why", parameters.target_activity_id from context, and a concise summary in explanation (planned vs actual, blocker, evidence status).
9. navigate_query: User asks "Where is TR-3 now?" (target=where), "When does V3 Load-out start?" (target=when), "What's blocking Voyage 4?" (target=what). Return intent="navigate_query", parameters.target (where|when|what), parameters.filter (voyage_ids/tr_unit_ids/anchor_types), and affected_activities with matching activity IDs.
10. Never execute actions. This API only parses intent and metadata.

# Examples
Input: "Move all Voyage 3 forward by 5 days"
Output: {"intent":"shift_activities","explanation":"Shift all Voyage 3 activities forward (advance) by 5 days","parameters":{"filter":{"voyage_ids":["V3"]},"action":{"type":"shift_days","delta_days":-5}},"ambiguity":null,"affected_activities":[...]}

Input: "Delay Load-out by 2 days but keep PTW"
Output: {"intent":"shift_activities","explanation":"Delay all Load-out activities by 2 days while preserving PTW constraints","parameters":{"filter":{"anchor_types":["LOADOUT"]},"action":{"type":"shift_days","delta_days":2,"preserve_constraints":["PTW"]}},"ambiguity":null,"affected_activities":[...]}

Input: "충돌 원인 설명해줘"
Output: {"intent":"explain_conflict","explanation":"Explain likely root causes for current conflicts","parameters":{"target":{"conflict_kind":"resource_overlap"},"analysis":{"root_cause_code":"resource_capacity","suggested_actions":["re-sequence non-critical activities","allocate backup crew"]}},"confidence":0.73,"risk_level":"low","requires_confirmation":true,"ambiguity":null}

Input: "승인 모드로 바꿔"
Output: {"intent":"set_mode","explanation":"Switch view mode to approval","parameters":{"mode":"approval","reason":"review and sign-off"},"confidence":0.91,"risk_level":"low","requires_confirmation":true,"ambiguity":null}

Input: "Why is this activity delayed?" (with selected activity A-300-LOADOUT, planned 2026-02-12, actual_start 2026-02-15)
Output: {"intent":"explain_why","explanation":"A-300-LOADOUT (Load-out) started 3 days later than planned (2026-02-12 → 2026-02-15). Possible causes: PTW window, weather, or resource availability. Check Evidence tab for supporting documents.","parameters":{"target_activity_id":"A-300-LOADOUT"},"confidence":0.85,"risk_level":"low","requires_confirmation":true,"ambiguity":null}

Input: "Where is TR-3 now?"
Output: {"intent":"navigate_query","explanation":"Navigate to Map and highlight TR-3 location","parameters":{"target":"where","filter":{"tr_unit_ids":["TR-3"]}},"affected_activities":["A-300-LOADOUT","A-310-SEA_TRANSIT",...],"confidence":0.9,"risk_level":"low","requires_confirmation":true,"ambiguity":null}

Input: "When does Voyage 3 Load-out start?"
Output: {"intent":"navigate_query","explanation":"Navigate to Timeline for V3 Load-out start date","parameters":{"target":"when","filter":{"voyage_ids":["V3"],"anchor_types":["LOADOUT"]}},"affected_activities":["A-300-LOADOUT"],"confidence":0.9,"risk_level":"low","requires_confirmation":true,"ambiguity":null}
`;

const REVIEW_PROMPT = `You are a strict reviewer for TR scheduling intent parsing.
You receive a user query and a parsed AI result.
Decide whether the parsed result is safe and unambiguous.

Return JSON only:
{
  "verdict": "approve" | "clarify",
  "reason": "short reason",
  "confidence": 0.0-1.0,
  "clarification_question": "required when verdict=clarify",
  "options": ["optional", "choices"]
}

Rules:
1. If intent/action may violate policy or is ambiguous, choose "clarify".
2. For apply_preview, require preview_ref="current".
3. For set_mode, mode must be one of live/history/approval/compare.
4. Prefer "approve" when the parse is clear and policy-safe.
`;

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  try {
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unknown provider error";
}

function deriveRisk(intent: AiIntent): AiRiskLevel {
  if (intent === "apply_preview") return "high";
  if (intent === "shift_activities" || intent === "prepare_bulk") return "medium";
  return "low";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`${label} timeout (${timeoutMs}ms)`);
      (err as Error & { status?: number }).status = 504;
      reject(err);
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function normalizeIntent(raw: unknown): AiIntent | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  const alias: Record<string, AiIntent> = {
    shift: "shift_activities",
    shift_activity: "shift_activities",
    shift_activities: "shift_activities",
    move: "shift_activities",
    delay: "shift_activities",
    prepare_bulk: "prepare_bulk",
    bulk: "prepare_bulk",
    bulk_edit: "prepare_bulk",
    explain_conflict: "explain_conflict",
    explain_conflicts: "explain_conflict",
    explain: "explain_conflict",
    explain_why: "explain_why",
    why: "explain_why",
    navigate_query: "navigate_query",
    navigate: "navigate_query",
    where: "navigate_query",
    when: "navigate_query",
    what: "navigate_query",
    set_mode: "set_mode",
    mode: "set_mode",
    switch_mode: "set_mode",
    apply_preview: "apply_preview",
    apply: "apply_preview",
    unclear: "unclear",
    clarify: "unclear",
    clarification_needed: "unclear",
  };
  return alias[value] ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function unwrapRawResult(raw: Record<string, unknown>): Record<string, unknown> {
  const candidates = [
    raw,
    asRecord(raw.result),
    asRecord(raw.output),
    asRecord(raw.data),
    asRecord(raw.payload),
    asRecord(raw.parsed),
    asRecord(raw.command),
  ].filter((x): x is Record<string, unknown> => Boolean(x));

  const winner = candidates.find((candidate) => {
    const intent =
      normalizeIntent(candidate.intent) ??
      normalizeIntent(candidate.action) ??
      normalizeIntent(candidate.command) ??
      normalizeIntent(candidate.type);
    return intent !== null;
  });

  return winner ?? raw;
}

function parseDeltaDaysFromQuery(query: string): number | null {
  const q = query.toLowerCase();
  const numberMatch = q.match(/(\d+)\s*(day|days|일)/);
  if (!numberMatch) return null;
  const num = Number(numberMatch[1]);
  if (!Number.isFinite(num)) return null;
  const isAdvance =
    q.includes("forward") ||
    q.includes("advance") ||
    q.includes("앞당") ||
    q.includes("당겨");
  const isDelay =
    q.includes("delay") ||
    q.includes("back") ||
    q.includes("late") ||
    q.includes("미뤄") ||
    q.includes("지연");
  if (isAdvance) return -num;
  if (isDelay) return num;
  return num;
}

function buildActivityContextForQuery(
  activities: ScheduleActivity[],
  query: string,
  selectedActivityId?: string | null
) {
  const q = query.toLowerCase();
  const voyageMatch = q.match(/voyage\s*([1-9])/i) ?? q.match(/항차\s*([1-9])/);
  const trMatch = q.match(/tr[-\s]?([1-9])/i);
  const wantsLoadout = q.includes("load-out") || q.includes("loadout") || q.includes("로드아웃");
  const wantsJackdown = q.includes("jack-down") || q.includes("jackdown") || q.includes("잭다운");
  const wantsSail =
    q.includes("sail") || q.includes("sea transit") || q.includes("sail-away") || q.includes("해상");

  let filtered = activities;
  if (voyageMatch) {
    const id = `V${voyageMatch[1]}`;
    filtered = filtered.filter((a) => (a.voyage_id ?? "") === id);
  }
  if (trMatch) {
    const id = `TR-${trMatch[1]}`;
    filtered = filtered.filter((a) => (a.tr_unit_id ?? "") === id);
  }
  if (wantsLoadout) {
    filtered = filtered.filter((a) => (a.anchor_type ?? "") === "LOADOUT");
  } else if (wantsJackdown) {
    filtered = filtered.filter((a) => (a.anchor_type ?? "") === "JACKDOWN");
  } else if (wantsSail) {
    filtered = filtered.filter((a) => (a.anchor_type ?? "") === "SAIL_AWAY");
  }

  // For explain_why: prioritize selected activity
  const base = filtered.length > 0 ? filtered : activities;
  let ordered = base;
  if (selectedActivityId && typeof selectedActivityId === "string") {
    const sel = base.find((a) => a.activity_id === selectedActivityId);
    if (sel) {
      ordered = [sel, ...base.filter((a) => a.activity_id !== selectedActivityId)];
    }
  }
  const selected = ordered.slice(0, MAX_ACTIVITY_CONTEXT);
  return selected.map((a) => ({
    activity_id: a.activity_id,
    activity_name: a.activity_name,
    voyage_id: a.voyage_id,
    tr_unit_id: a.tr_unit_id,
    anchor_type: a.anchor_type,
    planned_start: a.planned_start,
    planned_finish: a.planned_finish,
    actual_start: a.actual_start,
    actual_finish: a.actual_finish,
    status: a.status,
    blocker_code: a.blocker_code,
    constraints: a.constraint ? [a.constraint.type] : [],
  }));
}

function fallbackParseFromQuery(query: string): AiIntentResult {
  const q = query.toLowerCase();

  if ((q.includes("apply") && q.includes("preview")) || q.includes("프리뷰 적용")) {
    return {
      intent: "apply_preview",
      explanation: "Apply current preview",
      parameters: { preview_ref: "current" },
      ambiguity: null,
      confidence: 0.45,
      risk_level: "high",
      requires_confirmation: true,
    };
  }

  const modeMatch = q.match(/\b(live|history|approval|compare)\b/);
  if (modeMatch || q.includes("모드")) {
    const mode = (modeMatch?.[1] ?? (q.includes("승인") ? "approval" : "live")) as
      | "live"
      | "history"
      | "approval"
      | "compare";
    return {
      intent: "set_mode",
      explanation: `Switch view mode to ${mode}`,
      parameters: { mode },
      ambiguity: null,
      confidence: 0.45,
      risk_level: "low",
      requires_confirmation: true,
    };
  }

  if (q.includes("conflict") || q.includes("충돌")) {
    return {
      intent: "explain_conflict",
      explanation: "Explain current conflicts and suggested actions",
      parameters: {},
      ambiguity: null,
      confidence: 0.45,
      risk_level: "low",
      requires_confirmation: true,
    };
  }

  const wantsWhy =
    q.includes("why") ||
    q.includes("왜") ||
    q.includes("delayed") ||
    q.includes("blocked") ||
    q.includes("지연") ||
    q.includes("막혀") ||
    q.includes("원인") ||
    q.includes("evidence") ||
    q.includes("증빙");
  if (wantsWhy) {
    return {
      intent: "explain_why",
      explanation: "Summarize why the selected activity is delayed, blocked, or needs evidence.",
      parameters: {},
      ambiguity: null,
      confidence: 0.5,
      risk_level: "low",
      requires_confirmation: true,
    };
  }

  const wantsNavigate =
    q.includes("where") ||
    q.includes("when") ||
    q.includes("what") ||
    q.includes("어디") ||
    q.includes("언제") ||
    q.includes("무엇") ||
    (q.includes("얼마") && q.includes("시작"));
  if (wantsNavigate) {
    const voyageMatch = q.match(/voyage\s*([1-9])/i) ?? q.match(/항차\s*([1-9])/);
    const trMatch = q.match(/tr[-\s]?([1-9])/i);
    const filter: ShiftFilter = {};
    if (voyageMatch) filter.voyage_ids = [`V${voyageMatch[1]}`];
    if (trMatch) filter.tr_unit_ids = [`TR-${trMatch[1]}`];
    if (q.includes("load-out") || q.includes("loadout") || q.includes("로드아웃")) {
      filter.anchor_types = ["LOADOUT"];
    }
    if (q.includes("jack-down") || q.includes("jackdown") || q.includes("잭다운")) {
      filter.anchor_types = ["JACKDOWN"];
    }
    let target: "where" | "when" | "what" = "what";
    if (q.includes("where") || q.includes("어디")) target = "where";
    else if (q.includes("when") || q.includes("언제") || q.includes("start") || q.includes("시작")) target = "when";
    return {
      intent: "navigate_query",
      explanation: `Navigate to ${target === "where" ? "Map" : target === "when" ? "Timeline" : "Detail"} for matching activity`,
      parameters: { target, filter },
      ambiguity: null,
      confidence: 0.5,
      risk_level: "low",
      requires_confirmation: true,
    };
  }

  if (q.includes("bulk") || q.includes("anchor")) {
    return {
      intent: "prepare_bulk",
      explanation: "Prepare bulk anchors from natural language command",
      parameters: { anchors: [], label: "AI bulk draft" },
      ambiguity: null,
      confidence: 0.4,
      risk_level: "medium",
      requires_confirmation: true,
    };
  }

  const deltaDays = parseDeltaDaysFromQuery(query);
  if (
    q.includes("move") ||
    q.includes("shift") ||
    q.includes("delay") ||
    q.includes("forward") ||
    q.includes("advance") ||
    q.includes("미뤄") ||
    q.includes("이동")
  ) {
    const voyageMatch = q.match(/voyage\s*([1-9])/i) ?? q.match(/항차\s*([1-9])/);
    const trMatch = q.match(/tr[-\s]?([1-9])/i);
    const filter: ShiftFilter = {};
    if (voyageMatch) filter.voyage_ids = [`V${voyageMatch[1]}`];
    if (trMatch) filter.tr_unit_ids = [`TR-${trMatch[1]}`];
    if (q.includes("load-out") || q.includes("loadout") || q.includes("로드아웃")) {
      filter.anchor_types = ["LOADOUT"];
    }
    if (q.includes("jack-down") || q.includes("jackdown") || q.includes("잭다운")) {
      filter.anchor_types = ["JACKDOWN"];
    }

    const preserve: string[] = [];
    if (q.includes("ptw")) preserve.push("PTW");
    if (q.includes("cert")) preserve.push("CERT");
    if (q.includes("weather") || q.includes("기상")) preserve.push("WEATHER");

    return {
      intent: "shift_activities",
      explanation: "Shift activities parsed from natural language command",
      parameters: {
        filter,
        action: {
          type: "shift_days",
          delta_days: deltaDays ?? 1,
          ...(preserve.length > 0 ? { preserve_constraints: preserve } : {}),
        },
      },
      ambiguity: null,
      confidence: 0.42,
      risk_level: "medium",
      requires_confirmation: true,
    };
  }

  return {
    intent: "unclear",
    explanation: "Could not confidently parse command intent",
    parameters: {},
    ambiguity: {
      question: "Please clarify the target (voyage/activity) and action (shift/mode/apply).",
      options: ["Shift Voyage", "Set Mode", "Explain Conflict", "Apply Preview"],
    },
    confidence: 0.3,
    risk_level: "low",
    requires_confirmation: true,
  };
}

function normalizeAiResult(raw: Record<string, unknown>): AiIntentResult | null {
  const source = unwrapRawResult(raw);
  const intent =
    normalizeIntent(source.intent) ??
    normalizeIntent(source.action) ??
    normalizeIntent(source.command) ??
    normalizeIntent(source.type);
  if (!intent) return null;

  const explanation =
    (typeof source.explanation === "string" && source.explanation.trim()) ||
    (typeof source.reason === "string" && source.reason.trim()) ||
    (typeof source.summary === "string" && source.summary.trim()) ||
    (typeof source.message === "string" && source.message.trim()) ||
    `Parsed intent: ${intent}`;

  const confidenceRaw = source.confidence;
  const confidenceNum =
    typeof confidenceRaw === "string" ? Number(confidenceRaw) : confidenceRaw;
  const confidence =
    typeof confidenceNum === "number" && Number.isFinite(confidenceNum)
      ? Math.max(0, Math.min(1, confidenceNum))
      : 0.7;

  const riskRaw =
    source.risk_level ??
    source.riskLevel ??
    source.risk;
  const risk_level: AiRiskLevel =
    riskRaw === "low" || riskRaw === "medium" || riskRaw === "high"
      ? riskRaw
      : deriveRisk(intent);

  let parameters =
    source.parameters && typeof source.parameters === "object"
      ? (source.parameters as AiIntentResult["parameters"])
      : source.params && typeof source.params === "object"
      ? (source.params as AiIntentResult["parameters"])
      : source.payload && typeof source.payload === "object"
      ? (source.payload as AiIntentResult["parameters"])
      : undefined;

  const ambiguity =
    source.ambiguity && typeof source.ambiguity === "object"
      ? (source.ambiguity as AiIntentResult["ambiguity"])
      : null;

  const affectedActivities =
    Array.isArray(source.affected_activities)
      ? source.affected_activities.filter((x): x is string => typeof x === "string")
      : Array.isArray(source.affectedActivities)
      ? source.affectedActivities.filter((x): x is string => typeof x === "string")
      : undefined;

  const affectedCountRaw = source.affected_count ?? source.affectedCount;
  const affected_count =
    typeof affectedCountRaw === "number" ? affectedCountRaw : affectedActivities?.length;

  if (intent === "apply_preview") {
    const candidate =
      parameters?.preview_ref ??
      (parameters as { previewRef?: unknown } | undefined)?.previewRef ??
      source.preview_ref;
    if (!parameters) parameters = {};
    if (candidate === undefined) {
      parameters.preview_ref = "current";
    } else if (candidate === "current") {
      parameters.preview_ref = "current";
    }
  }

  if (intent === "set_mode") {
    const modeCandidate =
      parameters?.mode ?? (source.mode as string | undefined);
    if (typeof modeCandidate === "string") {
      const normalized = modeCandidate.toLowerCase();
      if (["live", "history", "approval", "compare"].includes(normalized)) {
        if (!parameters) parameters = {};
        parameters.mode = normalized as
          | "live"
          | "history"
          | "approval"
          | "compare";
      }
    }
  }

  return {
    intent,
    explanation,
    parameters,
    ambiguity,
    affected_activities: affectedActivities,
    affected_count,
    confidence,
    risk_level,
    requires_confirmation: true,
  };
}

async function callOpenAI(apiKey: string, userContent: string): Promise<string | null> {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? null;
}

async function callOllamaWithModel(
  userContent: string,
  model: string,
  systemPrompt = SYSTEM_PROMPT
): Promise<string | null> {
  const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      format: "json",
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!ollamaRes.ok) {
    const err = new Error(`Ollama request failed (${ollamaRes.status})`);
    (err as Error & { status?: number }).status = ollamaRes.status;
    throw err;
  }

  const ollamaJson = (await ollamaRes.json()) as {
    message?: { content?: string };
  };
  return ollamaJson?.message?.content ?? null;
}

async function callOllama(userContent: string): Promise<{ content: string | null; model: string }> {
  const models = [DEFAULT_OLLAMA_MODEL, ...OLLAMA_FALLBACK_MODELS];
  const modelErrors: string[] = [];
  let lastStatus: number | undefined;

  for (const model of models) {
    try {
      const content = await callOllamaWithModel(userContent, model);
      if (content) return { content, model };
      modelErrors.push(`${model}:empty`);
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      lastStatus = status;
      modelErrors.push(`${model}:${status ?? "ERR"}`);
    }
  }

  const err = new Error(`Ollama request failed (${modelErrors.join(", ")})`);
  (err as Error & { status?: number }).status = lastStatus;
  throw err;
}

function buildShiftWhatIfCandidates(result: AiIntentResult): number[] {
  const delta = result.parameters?.action?.delta_days;
  if (result.intent !== "shift_activities" || typeof delta !== "number") return [];
  const raw = [delta - 1, delta + 1, delta + 2].filter((value) => value !== delta);
  const unique = Array.from(new Set(raw));
  return unique.filter((value) => value >= -14 && value <= 14);
}

function buildGovernanceChecks(result: AiIntentResult) {
  const checks: NonNullable<AiIntentResult["governance_checks"]> = [
    {
      code: "CONFIRM_REQUIRED",
      status: result.requires_confirmation ? "pass" : "fail",
      message: result.requires_confirmation
        ? "Confirmation is required before execution."
        : "Execution confirmation flag is missing.",
    },
  ];

  if (result.intent === "apply_preview") {
    const isCurrent = result.parameters?.preview_ref === "current";
    checks.push({
      code: "APPLY_PREVIEW_REF",
      status: isCurrent ? "pass" : "fail",
      message: isCurrent
        ? "preview_ref='current' confirmed."
        : "preview_ref must be 'current'.",
    });
  }

  if (result.intent === "set_mode") {
    const mode = result.parameters?.mode;
    const allowed = ["live", "history", "approval", "compare"];
    const ok = typeof mode === "string" && allowed.includes(mode);
    checks.push({
      code: "MODE_ALLOWED",
      status: ok ? "pass" : "fail",
      message: ok
        ? `Mode '${mode}' is allowed.`
        : "Mode must be one of live/history/approval/compare.",
    });
  }

  if (result.risk_level === "high") {
    checks.push({
      code: "HIGH_RISK_CONFIRM",
      status: "warn",
      message: "High-risk intent requires explicit operator confirmation.",
    });
  }

  return checks;
}

async function reviewWithSecondaryModel(
  query: string,
  parsed: AiIntentResult,
  primaryModel: string | null
): Promise<{
  verdict: "approve" | "clarify";
  reason: string;
  confidence: number;
  clarification_question?: string;
  options?: string[];
  review_model: string;
} | null> {
  if (!AI_DUAL_REVIEW_ENABLED) return null;
  if (!OLLAMA_REVIEW_MODEL) return null;
  if (primaryModel && OLLAMA_REVIEW_MODEL === primaryModel) return null;
  if (
    parsed.intent === "unclear" ||
    parsed.intent === "explain_conflict" ||
    parsed.intent === "explain_why" ||
    parsed.intent === "navigate_query"
  )
    return null;

  const reviewInput = `Query: "${query}"
Parsed result:
${JSON.stringify(parsed, null, 2)}
`;

  try {
    const responseText = await callOllamaWithModel(reviewInput, OLLAMA_REVIEW_MODEL, REVIEW_PROMPT);
    if (!responseText) return null;
    const raw = extractJsonObject(responseText);
    if (!raw) return null;

    const verdictRaw = raw.verdict;
    const reasonRaw = raw.reason;
    const confidenceRaw = raw.confidence;
    const questionRaw = raw.clarification_question;
    const optionsRaw = raw.options;

    const verdict = verdictRaw === "clarify" ? "clarify" : "approve";
    const reason = typeof reasonRaw === "string" && reasonRaw.length > 0 ? reasonRaw : "No reason";
    const confidence =
      typeof confidenceRaw === "number" ? Math.max(0, Math.min(1, confidenceRaw)) : 0.5;
    const clarification_question =
      typeof questionRaw === "string" && questionRaw.trim().length > 0
        ? questionRaw.trim()
        : undefined;
    const options = Array.isArray(optionsRaw)
      ? optionsRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : undefined;

    return {
      verdict,
      reason,
      confidence,
      clarification_question,
      options,
      review_model: OLLAMA_REVIEW_MODEL,
    };
  } catch {
    // Fail-soft: keep primary parse when reviewer is unavailable.
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, activities, clarification, selectedActivityId } = body as {
      query: string;
      activities: ScheduleActivity[];
      clarification?: string;
      selectedActivityId?: string | null;
    };

    if (!query || !activities) {
      return NextResponse.json(
        { error: "Missing query or activities" },
        { status: 400 }
      );
    }

    // Prepare compact activity context (query-scoped + capped) to keep local LLM latency low.
    const activityContext = buildActivityContextForQuery(
      activities,
      query,
      selectedActivityId ?? undefined
    );

    const clarificationText =
      typeof clarification === "string" && clarification.trim().length > 0
        ? `\n\nUser clarification: "${clarification.trim()}"`
        : "";
    const userContent = `User query: "${query}"${clarificationText}\n\nActivities context (${activityContext.length}/${activities.length} activities):\n${JSON.stringify(activityContext, null, 2)}`;

    const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
    const hasValidOpenAIKey = apiKey.length >= MIN_API_KEY_LENGTH;
    const providerOrder =
      AI_PROVIDER === "ollama"
        ? (["ollama", ...(hasValidOpenAIKey ? ["openai"] : [])] as const)
        : ([...(hasValidOpenAIKey ? ["openai"] : []), "ollama"] as const);
    const fallbackProvider = providerOrder[0] ?? "ollama";

    let responseText: string | null = null;
    let usedProvider: "openai" | "ollama" | null = null;
    let primaryModel: string | null = null;
    const providerErrors: string[] = [];

    for (const provider of providerOrder) {
      try {
        if (provider === "openai") {
          responseText = await withTimeout(
            callOpenAI(apiKey, userContent),
            AI_PROVIDER_TIMEOUT_MS,
            "openai"
          );
          if (responseText) {
            usedProvider = "openai";
            primaryModel = OPENAI_MODEL;
          }
        } else {
          const ollama = await withTimeout(
            callOllama(userContent),
            AI_PROVIDER_TIMEOUT_MS,
            "ollama"
          );
          responseText = ollama.content;
          if (responseText) {
            usedProvider = "ollama";
            primaryModel = ollama.model;
          }
        }
        if (responseText) break;
      } catch (error: unknown) {
        const status = getErrorStatus(error);
        providerErrors.push(`${provider}:${status ?? "ERR"}`);
      }
    }

    const parsed = (() => {
      if (!responseText) {
        return fallbackParseFromQuery(query);
      }
      const rawParsed = extractJsonObject(responseText);
      if (!rawParsed) {
        return fallbackParseFromQuery(query);
      }
      return normalizeAiResult(rawParsed) ?? fallbackParseFromQuery(query);
    })();

    if (parsed.intent === "apply_preview" && parsed.parameters?.preview_ref !== "current") {
      return NextResponse.json(
        { error: "Policy violation: apply_preview requires preview_ref='current'" },
        { status: 422 }
      );
    }

    if (
      parsed.intent === "set_mode" &&
      parsed.parameters?.mode &&
      !["live", "history", "approval", "compare"].includes(parsed.parameters.mode)
    ) {
      return NextResponse.json(
        { error: "Policy violation: unsupported mode" },
        { status: 422 }
      );
    }

    // Calculate affected activities based on filter
    if (parsed.intent === "shift_activities" && parsed.parameters?.filter) {
      const filter = parsed.parameters.filter;
      const affected = activities.filter((a) => {
        const voyageId = a.voyage_id ?? "";
        const trUnitId = a.tr_unit_id ?? "";
        const matchVoyage = !filter.voyage_ids || filter.voyage_ids.includes(voyageId);
        const matchTR = !filter.tr_unit_ids || filter.tr_unit_ids.includes(trUnitId);
        const matchAnchor = !filter.anchor_types || filter.anchor_types?.includes(a.anchor_type || "");
        const matchId = !filter.activity_ids || filter.activity_ids.includes(a.activity_id || "");
        return matchVoyage && matchTR && matchAnchor && matchId;
      });
      parsed.affected_activities = affected
        .map((a) => a.activity_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      parsed.affected_count = affected.length;
    }

    if (parsed.intent === "prepare_bulk" && Array.isArray(parsed.parameters?.anchors)) {
      const ids = parsed.parameters.anchors
        .map((a) => a.activityId)
        .filter((x): x is string => typeof x === "string");
      parsed.affected_activities = ids;
      parsed.affected_count = ids.length;
    }

    if (parsed.intent === "navigate_query" && parsed.parameters?.filter) {
      const filter = parsed.parameters.filter;
      const affected = activities.filter((a) => {
        const voyageId = a.voyage_id ?? "";
        const trUnitId = a.tr_unit_id ?? "";
        const matchVoyage = !filter.voyage_ids?.length || filter.voyage_ids.includes(voyageId);
        const matchTR = !filter.tr_unit_ids?.length || filter.tr_unit_ids.includes(trUnitId);
        const matchAnchor = !filter.anchor_types?.length || filter.anchor_types?.includes(a.anchor_type || "");
        const matchId = !filter.activity_ids?.length || filter.activity_ids?.includes(a.activity_id || "");
        return matchVoyage && matchTR && matchAnchor && matchId;
      });
      parsed.affected_activities = affected
        .map((a) => a.activity_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      parsed.affected_count = affected.length;
      if (!parsed.parameters.target) {
        parsed.parameters.target = "what";
      }
    }

    if (parsed.intent === "explain_why" && selectedActivityId) {
      const act = activities.find((a) => a.activity_id === selectedActivityId);
      if (act) {
        parsed.parameters = { ...parsed.parameters, target_activity_id: selectedActivityId };
        parsed.affected_activities = [selectedActivityId];
        parsed.affected_count = 1;
        if (!parsed.explanation || parsed.confidence < 0.6) {
          const parts: string[] = [];
          parts.push(`${act.activity_name} (${act.activity_id ?? "—"})`);
          if (act.planned_start) parts.push(`Planned: ${act.planned_start} → ${act.planned_finish ?? "—"}`);
          if (act.actual_start || act.actual_finish) {
            parts.push(`Actual: ${act.actual_start ?? "—"} → ${act.actual_finish ?? "—"}`);
          }
          if (act.blocker_code) parts.push(`Blocked by: ${act.blocker_code}`);
          if (act.status) parts.push(`Status: ${act.status}`);
          if (act.constraint) parts.push(`Constraint: ${act.constraint.type}`);
          parsed.explanation = parts.join(". ");
          parsed.confidence = Math.max(parsed.confidence, 0.6);
        }
      }
    }

    let secondaryReviewNote: string | null = null;
    // Optional dual-model safety pass for local Ollama operation.
    if (usedProvider === "ollama") {
      const review = await reviewWithSecondaryModel(query, parsed, primaryModel);
      if (review) {
        parsed.model_trace = {
          provider: "ollama",
          primary_model: primaryModel ?? undefined,
          review_model: review.review_model,
          review_verdict: review.verdict,
          review_reason: review.reason,
        };

        const isStrictIntent =
          parsed.intent === "apply_preview" ||
          parsed.intent === "set_mode" ||
          parsed.risk_level === "high";
        if (review.verdict === "clarify" && review.confidence >= 0.65 && isStrictIntent) {
          parsed.intent = "unclear";
          parsed.ambiguity = {
            question:
              review.clarification_question ??
              "Please clarify target voyage/activity before execution.",
            options: review.options,
          };
          parsed.explanation = `${parsed.explanation} (secondary review requested clarification)`;
          parsed.risk_level = "low";
        } else if (review.verdict === "clarify") {
          secondaryReviewNote =
            review.clarification_question ??
            `Secondary review raised ambiguity: ${review.reason}`;
        }
      } else {
        parsed.model_trace = {
          provider: "ollama",
          primary_model: primaryModel ?? undefined,
        };
      }
    } else if (usedProvider === "openai") {
      parsed.model_trace = {
        provider: "openai",
        primary_model: primaryModel ?? undefined,
      };
    } else {
      parsed.model_trace = {
        provider: fallbackProvider as "ollama" | "openai",
      };
    }

    const whatIfShiftDays = buildShiftWhatIfCandidates(parsed);
    const nextSteps: string[] = [];
    if (parsed.intent === "shift_activities" || parsed.intent === "prepare_bulk") {
      nextSteps.push("Run Preview first, then review collisions and freeze/lock violations.");
    }
    if (parsed.risk_level === "high") {
      nextSteps.push("High-risk command: require explicit operator confirmation.");
    }
    parsed.recommendations = {
      ...(whatIfShiftDays.length > 0 ? { what_if_shift_days: whatIfShiftDays } : {}),
      ...(nextSteps.length > 0 ? { next_steps: nextSteps } : {}),
    };
    parsed.governance_checks = buildGovernanceChecks(parsed);
    if (secondaryReviewNote) {
      parsed.governance_checks.push({
        code: "SECONDARY_REVIEW_NOTE",
        status: "warn",
        message: secondaryReviewNote,
      });
    }
    if (providerErrors.length > 0) {
      parsed.governance_checks.push({
        code: "PROVIDER_FALLBACK",
        status: "warn",
        message: `Provider fallback/timeout detected: ${providerErrors.join(", ")}`,
      });
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    const safeMessage = getErrorMessage(error);

    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: "Model provider authentication failed" },
        { status: 401 }
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { error: "Model provider rate limit exceeded" },
        { status: 429 }
      );
    }

    if (typeof status === "number" && status >= 500) {
      return NextResponse.json(
        { error: "Model provider temporarily unavailable" },
        { status: 503 }
      );
    }

    console.error("[nl-command] Error:", safeMessage);
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
