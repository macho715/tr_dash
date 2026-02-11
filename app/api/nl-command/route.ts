import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { AiIntent, AiIntentResult, AiRiskLevel } from "@/lib/ops/ai-intent";

const MIN_API_KEY_LENGTH = 20;
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "exaone3.5:7.8b";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
const AI_PROVIDER = (process.env.AI_PROVIDER || "").toLowerCase();
const AI_DUAL_REVIEW_ENABLED = process.env.AI_DUAL_REVIEW_ENABLED !== "0";
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
  "intent": "shift_activities" | "prepare_bulk" | "explain_conflict" | "set_mode" | "apply_preview" | "unclear",
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
8. Never execute actions. This API only parses intent and metadata.

# Examples
Input: "Move all Voyage 3 forward by 5 days"
Output: {"intent":"shift_activities","explanation":"Shift all Voyage 3 activities forward (advance) by 5 days","parameters":{"filter":{"voyage_ids":["V3"]},"action":{"type":"shift_days","delta_days":-5}},"ambiguity":null,"affected_activities":[...]}

Input: "Delay Load-out by 2 days but keep PTW"
Output: {"intent":"shift_activities","explanation":"Delay all Load-out activities by 2 days while preserving PTW constraints","parameters":{"filter":{"anchor_types":["LOADOUT"]},"action":{"type":"shift_days","delta_days":2,"preserve_constraints":["PTW"]}},"ambiguity":null,"affected_activities":[...]}

Input: "충돌 원인 설명해줘"
Output: {"intent":"explain_conflict","explanation":"Explain likely root causes for current conflicts","parameters":{"target":{"conflict_kind":"resource_overlap"},"analysis":{"root_cause_code":"resource_capacity","suggested_actions":["re-sequence non-critical activities","allocate backup crew"]}},"confidence":0.73,"risk_level":"low","requires_confirmation":true,"ambiguity":null}

Input: "승인 모드로 바꿔"
Output: {"intent":"set_mode","explanation":"Switch view mode to approval","parameters":{"mode":"approval","reason":"review and sign-off"},"confidence":0.91,"risk_level":"low","requires_confirmation":true,"ambiguity":null}
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

function normalizeAiResult(raw: Record<string, unknown>): AiIntentResult | null {
  const intentRaw = typeof raw.intent === "string" ? raw.intent : null;
  const explanation = typeof raw.explanation === "string" ? raw.explanation : "";
  if (!intentRaw || !explanation) return null;

  const allowedIntents: AiIntent[] = [
    "shift_activities",
    "prepare_bulk",
    "explain_conflict",
    "set_mode",
    "apply_preview",
    "unclear",
  ];
  if (!allowedIntents.includes(intentRaw as AiIntent)) return null;
  const intent = intentRaw as AiIntent;

  const confidenceRaw = raw.confidence;
  const confidence =
    typeof confidenceRaw === "number"
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.7;

  const riskRaw = raw.risk_level;
  const risk_level: AiRiskLevel =
    riskRaw === "low" || riskRaw === "medium" || riskRaw === "high"
      ? riskRaw
      : deriveRisk(intent);

  const parameters =
    raw.parameters && typeof raw.parameters === "object"
      ? (raw.parameters as AiIntentResult["parameters"])
      : undefined;

  const ambiguity =
    raw.ambiguity && typeof raw.ambiguity === "object"
      ? (raw.ambiguity as AiIntentResult["ambiguity"])
      : null;

  const affectedActivities =
    Array.isArray(raw.affected_activities)
      ? raw.affected_activities.filter((x): x is string => typeof x === "string")
      : undefined;

  const affectedCountRaw = raw.affected_count;
  const affected_count =
    typeof affectedCountRaw === "number" ? affectedCountRaw : affectedActivities?.length;

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
  if (parsed.intent === "unclear" || parsed.intent === "explain_conflict") return null;

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
    const { query, activities, clarification } = body as {
      query: string;
      activities: ScheduleActivity[];
      clarification?: string;
    };

    if (!query || !activities) {
      return NextResponse.json(
        { error: "Missing query or activities" },
        { status: 400 }
      );
    }

    // Prepare activity context (minimal info to reduce token usage)
    const activityContext = activities.map((a) => ({
      activity_id: a.activity_id,
      activity_name: a.activity_name,
      voyage_id: a.voyage_id,
      tr_unit_id: a.tr_unit_id,
      anchor_type: a.anchor_type,
      planned_start: a.planned_start,
      planned_finish: a.planned_finish,
      constraints: a.constraint ? [a.constraint.type] : [],
    }));

    const clarificationText =
      typeof clarification === "string" && clarification.trim().length > 0
        ? `\n\nUser clarification: "${clarification.trim()}"`
        : "";
    const userContent = `User query: "${query}"${clarificationText}\n\nActivities context (${activities.length} activities):\n${JSON.stringify(activityContext, null, 2)}`;

    const apiKey = (process.env.OPENAI_API_KEY ?? "").trim();
    const hasValidOpenAIKey = apiKey.length >= MIN_API_KEY_LENGTH;
    const providerOrder =
      AI_PROVIDER === "ollama"
        ? (["ollama", ...(hasValidOpenAIKey ? ["openai"] : [])] as const)
        : ([...(hasValidOpenAIKey ? ["openai"] : []), "ollama"] as const);

    let responseText: string | null = null;
    let usedProvider: "openai" | "ollama" | null = null;
    let primaryModel: string | null = null;
    const providerErrors: string[] = [];

    for (const provider of providerOrder) {
      try {
        if (provider === "openai") {
          responseText = await callOpenAI(apiKey, userContent);
          if (responseText) {
            usedProvider = "openai";
            primaryModel = OPENAI_MODEL;
          }
        } else {
          const ollama = await callOllama(userContent);
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

    if (!responseText) {
      return NextResponse.json(
        { error: `No response from AI providers (${providerErrors.join(", ")})` },
        { status: 503 }
      );
    }

    const rawParsed = extractJsonObject(responseText);
    if (!rawParsed) {
      return NextResponse.json(
        { error: "Invalid JSON response from model provider" },
        { status: 500 }
      );
    }

    const parsed = normalizeAiResult(rawParsed);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid response structure from LLM" },
        { status: 500 }
      );
    }

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
