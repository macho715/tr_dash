import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { openaiCreateMock } = vi.hoisted(() => ({
  openaiCreateMock: vi.fn(),
}));

vi.mock("openai", () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: openaiCreateMock,
      },
    };
  }
  return { default: MockOpenAI };
});

type MinimalActivity = {
  activity_id: string;
  activity_name: string;
  voyage_id: string;
  tr_unit_id: string;
  anchor_type: string;
  planned_start: string;
  planned_finish: string;
  constraints: Array<{ constraint_type: string }>;
};

const activities: MinimalActivity[] = [
  {
    activity_id: "A300",
    activity_name: "Load-out",
    voyage_id: "V3",
    tr_unit_id: "TR-3",
    anchor_type: "LOADOUT",
    planned_start: "2026-02-12",
    planned_finish: "2026-02-13",
    constraints: [{ constraint_type: "PTW" }],
  },
];

function makeRequest(query: string, data = activities) {
  return new NextRequest("http://localhost:3000/api/nl-command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, activities: data }),
  });
}

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AI_PROVIDER = "ollama";
  process.env.OLLAMA_MODEL = "exaone3.5:7.8b";
  process.env.OPENAI_API_KEY = "";
});

describe("/api/nl-command", () => {
  it("parses EXAONE JSON response and enforces requires_confirmation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            intent: "shift_activities",
            explanation: "Shift Voyage 3 forward by 5 days",
            parameters: {
              filter: { voyage_ids: ["V3"] },
              action: { type: "shift_days", delta_days: -5 },
            },
            confidence: 0.82,
            risk_level: "medium",
          }),
        },
      }),
    }) as unknown as typeof fetch;

    const { POST } = await loadRoute();
    const res = await POST(makeRequest("Move all Voyage 3 forward 5 days"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.intent).toBe("shift_activities");
    expect(body.requires_confirmation).toBe(true);
    expect(body.confidence).toBeGreaterThan(0);
  });

  it("recovers JSON wrapped in markdown fences", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content:
            "```json\n{\"intent\":\"set_mode\",\"explanation\":\"Switch to approval\",\"parameters\":{\"mode\":\"approval\"}}\n```",
        },
      }),
    }) as unknown as typeof fetch;

    const { POST } = await loadRoute();
    const res = await POST(makeRequest("승인 모드로 바꿔"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.intent).toBe("set_mode");
    expect(body.parameters.mode).toBe("approval");
    expect(body.requires_confirmation).toBe(true);
  });

  it("falls back to Ollama when OpenAI fails", async () => {
    process.env.AI_PROVIDER = "";
    process.env.OPENAI_API_KEY = "sk-valid-key-long-enough-1234567890";
    openaiCreateMock.mockRejectedValueOnce({ status: 429, message: "rate limited" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            intent: "prepare_bulk",
            explanation: "Prepared anchors",
            parameters: {
              anchors: [{ activityId: "A300", newStart: "2026-02-15" }],
              label: "AI bulk",
            },
          }),
        },
      }),
    }) as unknown as typeof fetch;

    const { POST } = await loadRoute();
    const res = await POST(makeRequest("Prepare bulk for voyage 3"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(openaiCreateMock).toHaveBeenCalledTimes(1);
    expect(body.intent).toBe("prepare_bulk");
    expect(body.affected_count).toBe(1);
  });

  it("returns 422 when apply_preview preview_ref is not current", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify({
            intent: "apply_preview",
            explanation: "Apply preview",
            parameters: { preview_ref: "invalid" },
          }),
        },
      }),
    }) as unknown as typeof fetch;

    const { POST } = await loadRoute();
    const res = await POST(makeRequest("apply now"));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/preview_ref/);
  });
});
