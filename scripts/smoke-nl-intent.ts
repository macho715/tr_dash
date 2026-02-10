import { NextRequest } from "next/server";
import type { AiIntent } from "@/lib/ops/ai-intent";

type SmokeCase = {
  id: string;
  query: string;
  expectedIntents: AiIntent[];
  clarification?: {
    option: string;
    expectedIntents: AiIntent[];
  };
};

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

const SAMPLE_ACTIVITIES: MinimalActivity[] = [
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
  {
    activity_id: "A310",
    activity_name: "Sea Transit",
    voyage_id: "V3",
    tr_unit_id: "TR-3",
    anchor_type: "SAIL_AWAY",
    planned_start: "2026-02-14",
    planned_finish: "2026-02-15",
    constraints: [{ constraint_type: "WEATHER" }],
  },
];

const CASES: SmokeCase[] = [
  { id: "KO-01", query: "Voyage 3를 5일 앞당겨", expectedIntents: ["shift_activities"] },
  {
    id: "EN-02",
    query: "Move all Voyage 2 activities forward by 3 days and keep PTW",
    expectedIntents: ["shift_activities"],
  },
  { id: "KO-03", query: "로드아웃 작업을 2일 지연", expectedIntents: ["shift_activities"] },
  { id: "EN-04", query: "Prepare bulk anchors for TR-3 by +2 days", expectedIntents: ["prepare_bulk", "shift_activities"] },
  { id: "KO-05", query: "충돌 원인과 해결안을 설명해줘", expectedIntents: ["explain_conflict"] },
  { id: "EN-06", query: "Explain current resource conflict and suggest actions", expectedIntents: ["explain_conflict"] },
  { id: "KO-07", query: "승인 모드로 전환해", expectedIntents: ["set_mode"] },
  { id: "EN-08", query: "Switch to compare mode", expectedIntents: ["set_mode"] },
  { id: "KO-09", query: "현재 preview 적용해", expectedIntents: ["apply_preview"] },
  { id: "EN-10", query: "Apply current preview now", expectedIntents: ["apply_preview"] },
  {
    id: "KO-11-AMB",
    query: "2일 미뤄줘",
    expectedIntents: ["unclear", "shift_activities"],
    clarification: {
      option: "Voyage 3",
      expectedIntents: ["shift_activities", "prepare_bulk"],
    },
  },
  {
    id: "EN-12-AMB",
    query: "Move it by 2 days",
    expectedIntents: ["unclear", "shift_activities"],
    clarification: {
      option: "TR-3 load-out activities",
      expectedIntents: ["shift_activities", "prepare_bulk"],
    },
  },
];

async function run() {
  if (!process.env.AI_PROVIDER) process.env.AI_PROVIDER = "ollama";
  if (!process.env.OLLAMA_MODEL) process.env.OLLAMA_MODEL = "exaone3.5:7.8b";

  const { POST } = await import("../app/api/nl-command/route");
  const results: Array<{
    id: string;
    status: number;
    intent: string;
    expected: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const c of CASES) {
    try {
      const req = new NextRequest("http://localhost:3000/api/nl-command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: c.query, activities: SAMPLE_ACTIVITIES }),
      });

      const res = await POST(req);
      const body = await res.json();
      const intent = typeof body.intent === "string" ? body.intent : "";
      const firstPass = res.status === 200 && c.expectedIntents.includes(intent as AiIntent);
      let ok = firstPass;
      let error = body.error;

      if (c.clarification) {
        const clarifyReq = new NextRequest("http://localhost:3000/api/nl-command", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: c.query,
            activities: SAMPLE_ACTIVITIES,
            clarification: c.clarification.option,
          }),
        });
        const clarifyRes = await POST(clarifyReq);
        const clarifyBody = await clarifyRes.json();
        const clarifyIntent =
          typeof clarifyBody.intent === "string" ? clarifyBody.intent : "";
        ok =
          firstPass &&
          clarifyRes.status === 200 &&
          c.clarification.expectedIntents.includes(clarifyIntent as AiIntent);
        error = ok
          ? undefined
          : clarifyBody.error ||
            `clarification intent=${clarifyIntent || "-"} expected=${c.clarification.expectedIntents.join("|")}`;
      }

      results.push({
        id: c.id,
        status: res.status,
        intent: intent || "-",
        expected: c.expectedIntents.join("|"),
        ok,
        error,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        id: c.id,
        status: 0,
        intent: "-",
        expected: c.expectedIntents.join("|"),
        ok: false,
        error: message,
      });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  console.log("== NL Intent Smoke Test ==");
  console.log(`provider=${process.env.AI_PROVIDER} model=${process.env.OLLAMA_MODEL}`);
  console.log(`passed=${passed} failed=${failed} total=${results.length}`);
  console.log("");
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    const extra = r.error ? ` error=${r.error}` : "";
    console.log(`${mark} ${r.id} status=${r.status} intent=${r.intent} expected=${r.expected}${extra}`);
  }

  if (failed > 0) process.exit(1);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Smoke runner failed:", message);
  process.exit(1);
});
