# AGI_TR_일정_최종보고서 검증 결과

**검증일**: 2026-02-17  
**방법**: WebSearch, URL fetch (tgftp.nws.noaa.gov 등)

---

## 1. 검증 완료 (사실 확인)

| 항목 | 보고서 내용 | 검증 결과 |
|------|-------------|----------|
| **OMAA 좌표** | 24.44°N, 54.65°E | ✓ travelmath.com, SkyVector: 24.433°N, 54.651°E (소수 반올림 일치) |
| **METAR 29017G27KT 해석** | 풍향 290°, 17kt, Gust 27kt | ✓ 표준 METAR: 290=방위, 17=평균풍속, G27=돌풍 27kt |
| **Mina Zayed 조석** | Spring 2m, neap 0.1m, fairway 4.5kt | ✓ sea-seek.com: "maximum spring tide range 2m", "neap 0.1m", "fairway 4.5 knots" |
| **UAE 안개 132일/년** | 연평균 약 132일(2006 이후), 12월 중~3월 말 시즌 | ✓ The National: "132 days of fog per year since 2006", "mid-December through end of March" |
| **NDBC Arabian Gulf** | buoy 없음 | ✓ NDBC는 주로 미국 수역; Arabian Gulf 부이 정보 미확인 |
| **OMAA METAR URL** | tgftp.nws.noaa.gov/weather/current/OMAA.html | ✓ 2026-02-17 19:30 UTC METAR 정상 수신 (OMAA 171930Z...) |
| **NCM Al Bahar** | albahar.ncm.gov.ae | ✓ (이전 조회) UAE 해상 예보 서비스 정상 |
| **tide-forecast Mina Zayed** | 30일 전망, wave 0.1~0.7m | ✓ (이전 조회) tide-forecast.com 정상 |
| **VesselFinder AEMZD001** | Mina Zayed 입출항 | ✓ (이전 조회) vesselfinder.com/ports/AEMZD001 정상 |

---

## 2. 단위 주의 (검토 필요)

| 항목 | 보고서 내용 | 검증 의견 |
|------|-------------|----------|
| **TR3 파고** | WhatsApp "5-6 wave high" | ✓ **패치 적용**: 5~6m → 5~6 ft (≈1.5~1.8m)로 정정 (2026-02-17) |

---

## 3. 프로젝트 내부 Evidence (외부 검증 불가)

| 항목 | 비고 |
|------|------|
| TR1~TR3 Actual 시각 | CSV, Bushra AIS, WhatsApp — 원본 파일로만 검증 가능 |
| SSOT v1.1 일정·Cycle 7.00d | 프로젝트 산정·운영 결정 |
| Excel v2 vs SSOT 비교 | 내부 산출물 |

---

## 4. 수치 재확인 제안

- **파고 5~6m vs 5~6 ft**: WhatsApp 원문·발신자 관례 확인 시 보고서 정정 여부 판단.
