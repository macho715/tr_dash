
외부 검색과 프로젝트 AI 기능 상태를 바탕으로 **TR 대시보드 AI 기능 업데이트 아이디어**를 정리했습니다.

---

# TR 대시보드 AI 기능 업데이트 아이디어

## 1. 사용자 PC 사양·로컬 LLM 가정

| 사양        | 최소                         | 권장                        | 고사양                       |
| ----------- | ---------------------------- | --------------------------- | ---------------------------- |
| RAM         | 8GB                          | 16GB                        | 32GB+                        |
| VRAM        | 없음                         | 4–8GB                      | 12GB+                        |
| 가능 모델   | 3B 이하 (CPU)                | 3–7B                       | 7–14B                       |
| Ollama 예시 | SmolLM2 1.7B, TinyLlama 1.1B | Qwen2.5 3B, Phi-3 Mini 3.8B | Llama 3.1 8B, exaone3.5 7.8b, SEOKDONG-llama3.1_korean_Q5_K_M |

현재 `exaone3.5:7.8b` 또는 `kwangsuklee/SEOKDONG-llama3.1_korean_Q5_K_M` 사용 가능. **16GB RAM + 8GB VRAM** 수준 가정.

---

## 2. 외부 트렌드 기반 아이디어 (2024–2025)

### Tier 1: 우선순위 높음 (로컬 LLM 적합)

| 아이디어                                 | 설명                                                      | 구현 난이도 | 로컬 LLM | 사양 |
| ---------------------------------------- | --------------------------------------------------------- | ----------- | -------- | ---- |
| **1. 자연어 Where/When/What 질의** | "Where is TR-3 now?" → Map/Detail 자동 포커스            | 중          | ✅       | 3B+  |
| **2. Intent 추천**                 | 현재 컨텍스트 기반 다음 명령 추천 (예: "Shift Voyage 3")  | 중          | ✅       | 3B+  |
| **3. Why 2-click 요약**            | "Why this activity delayed?" → Evidence/History 요약     | 중          | ✅       | 3B+  |
| **4. 충돌 해결 제안**              | "Suggest fix for PTW conflict" → Wait/Priority/Swap 제안 | 상          | ✅       | 7B+  |

### Tier 2: 중간 우선순위 (클라우드/로컬 혼용)

| 아이디어                            | 설명                                        | 구현 난이도 | 로컬 LLM | 사양            |
| ----------------------------------- | ------------------------------------------- | ----------- | -------- | --------------- |
| **5. Evidence 누락 검사**     | READY→IN_PROGRESS 전 필요한 증빙 자동 체크 | 낮          | ✅       | 3B+             |
| **6. 다이얼로그 자연어 설명** | AIExplainDialog 내 설명을 현재 모델로 개선  | 낮          | ✅       | 3B+             |
| **7. Multi-turn 대화**        | 연속 질의 컨텍스트 유지 (미구현 → 구현)    | 상          | ⚠️     | 7B+/메모리 주의 |

### Tier 3: 클라우드/고사양 우선

| 아이디어                        | 설명                                     | 구현 난이도 | 로컬 LLM | 사양           |
| ------------------------------- | ---------------------------------------- | ----------- | -------- | -------------- |
| **8. 예측 분석**          | 일정 리스크 예측 (날씨/리소스/ETA)       | 상          | ⚠️     | 7B+ 또는 cloud |
| **9. 대시보드 메트릭 NL** | "Show total delay days" 등 자연어 → KPI | 중          | ⚠️     | JSON/Text2SQL  |

---

## 3. 로컬 LLM 모델 추천 (사양별)

| 사양     | 모델                         | 용도                   | 메모리 |
| -------- | ---------------------------- | ---------------------- | ------ |
| RAM 8GB  | SmolLM2 1.7B, TinyLlama 1.1B | Intent 파싱, 짧은 요약 | ~2GB   |
| RAM 16GB | Qwen2.5 3B, Phi-3 Mini 3.8B  | 의도 파싱 + 추천       | 4–5GB |
| GPU 8GB  | exaone3.5 7.8b, Llama 3.1 8B, SEOKDONG-llama3.1_korean_Q5_K_M | 현재와 동일, 한국어 Llama | 6–8GB |

- **CPU만**: 3B 이하 (Q4_K_M) 권장, 4B+는 느림
- **GPU 4–8GB**: 3–7B, Q4_K_M 사용 권장

---

## 4. TR 도메인 특화 아이디어

| 아이디어                 | Where/When/What 연결                                       | 구현 난이도 |
| ------------------------ | ---------------------------------------------------------- | ----------- |
| **위치 기반 질의** | "Where is TR-3?" → Map 지오펜스/구간 하이라이트           | 중          |
| **상태 기반 질의** | "What's delayed?" → 상태별 필터 + 하이라이트              | 낮          |
| **증빙 기반 질의** | "Which activities need evidence?" → Evidence 탭 점프      | 낮          |
| **일정 추천**      | "Suggest safe shift for Voyage 3" → What-if + Reflow 제안 | 상          |

---

## 5. 실행 단계 제안

1. **단기 (1–2주)**:

   - Where/When/What 자연어 질의(1), Evidence 누락 검사(5)
   - SmolLM2 1.7B 또는 Qwen2.5 3B로 가벼운 파서 추가
2. **중기 (1–2개월)**:

   - Intent 추천(2), Why 2-click 요약(3), 다이얼로그 설명 개선(6)
3. **장기**:

   - Multi-turn(7), 충돌 해결 제안(4), 예측 분석(8)

---

## 6. 참고 자료

- [ThoughtSpot AI Dashboard Trends 2025](https://www.thoughtspot.com/data-trends/dashboard/ai-dashboard) – AI 대시보드 트렌드
- [Databricks AI/BI Dashboards Fall &#39;24](https://databricks.com/blog/whats-new-in-aibi-dashboards-fall24) – NL 질의, AI Agent
- [Top Lightweight LLMs 2025](https://localaimaster.com/blog/top-lightweight-models) – Sub-7B 모델 비교
- [Ollama VRAM Requirements](https://localllm.in/blog/ollama-vram-requirements-for-local-llms) – 사양별 VRAM 가이드
- [Databao Agent](https://github.com/JetBrains/databao) – LLM + Ollama + JSON/데이터 쿼리

---

**추천**:

- RAM 16GB 이하라면 **SmolLM2 1.7B** 또는 **Qwen2.5 3B**로 Where/When/What 질의 파서를 먼저 구현하고,
- GPU 8GB 이상이면 **exaone3.5 7.8b** 유지 + **Intent 추천** 기능을 추가하는 흐름을 권장합니다.

원하시면 위 아이디어 중 하나를 골라서 구현 단계별 설계(API/컴포넌트 구조)까지 구체화해 드리겠습니다.

---

## 1. 자연어 Where/When/What 질의

**"Where is TR-3 now?" → Map/Detail 자동 포커스**

| 항목                  | 내용                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **핵심**        | Where/When/What 중 하나를 자연어로 묻고, 해당 패널로 자동 포커스/스크롤                                                            |
| **질의 예**     | "Where is TR-3 now?", "When does V3 Load-out start?", "What's blocking Voyage 4?"                                                  |
| **동작**        | 새 intent `navigate_query` → Map/Timeline/Detail 열 + 해당 activity/TR 하이라이트                                               |
| **구현 포인트** | `/api/nl-command`에 intent 추가, `UnifiedCommandPalette`에서 `navigate_query` 처리 → Map/Timeline/Detail + 선택/스크롤 호출 |

---

## 2. Intent 추천

**현재 컨텍스트 기반 다음 명령 추천**

| 항목                  | 내용                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **핵심**        | 현재 선택/모드/충돌/슬랙 상태를 보고, 다음에 할 만한 명령을 2~3개 추천                                          |
| **예시**        | 선택된 Activity가 여러 개 → "Shift selected activities by 2 days" 추천                                         |
| **동작**        | Palette 열릴 때 또는 선택 변경 시 LLM 호출 → 추천 문구 버튼 노출                                               |
| **구현 포인트** | `selectedActivityIds`, `currentMode`, `collisions` 등의 컨텍스트를 짧게 전달 → 3B+ 모델로 추천 문구 생성 |

---

## 3. Why 2-click 요약

**"Why this activity delayed?" → Evidence/History 요약**

| 항목                  | 내용                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **핵심**        | 특정 activity의 이유(Why)를 묻는 질의에서 Evidence/History를 LLM에 전달해 요약                                    |
| **질의 예**     | "Why is this delayed?", "Why blocked?", "What's the evidence for this?"                                           |
| **동작**        | 새 intent `explain_why` → 선택된 activity의 evidence/history → LLM 요약 → AIExplainDialog 또는 팝오버로 표시 |
| **구현 포인트** | `lib/ops/ai-intent.ts`에 `explain_why` 추가, evidence/history 컨텍스트 최대 N개로 제한 후 전송                |

---

## 구현 우선순위 제안

| 순서 | 기능                 | 이유                                                     |
| ---- | -------------------- | -------------------------------------------------------- |
| 1    | Why 2-click 요약     | 기존 `explain_conflict`와 유사, AIExplainDialog 재사용 |
| 2    | Where/When/What 질의 | 기존 네비게이션 로직만 연결하면 됨                       |
| 3    | Intent 추천          | Palette UI 변경 및 컨텍스트 전달 설계 필요               |

먼저 구현하고 싶은 기능을 지정해 주시면, 그 기능부터 구체 API/구조 설계까지 정리해 드리겠습니다.
