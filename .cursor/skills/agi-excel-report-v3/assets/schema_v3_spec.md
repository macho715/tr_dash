# v3.0-spec 핵심

- TZ: Asia/Dubai (UTC+4)
- DateTime: YYYY-MM-DD HH:MM (LT), UTC 필요 시 *_UTC 분리
- Numeric: 2-dec 고정
- Trace: Event → Segment → Window → Cause → EvidenceID
- Evidence 가중치: OFFICIAL=3, AIS=2, CHAT=1 (SSOT param)
- Gate Verdict: OK/LIMIT/FAIL/VERIFY (값 없으면 VERIFY)

## 참고(방법론/정의)

- AACE 29R-03 (Forensic Schedule Analysis): https://web.aacei.org/
- SCL Delay & Disruption Protocol 2nd Ed (투명성/기법 선택)
- ASQ Fishbone 정의
- PSNet: 5-Why 과단순화 경고
- METAR decode key: weather.gov
- NCM Al Bahar marine bulletin (UAE)
- QSRA P50/P80/P90 개념(참고)
