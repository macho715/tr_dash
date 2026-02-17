#### Critical Path / Float 고정 선언(운영 기준)

- **Critical Path**: TR4 → TR5 → TR6 → TR7 은 직렬(Serial)로 연결된 경로로 간주하며, **Float = 0.00d** 로 정의한다.  
  → 변동 발생 시 후속 항차에 **연쇄(Propagation)** 된다. *(가정: TR4~TR7 자원/berth 제약으로 병렬화 불가)*

- **Schedule Variance(날짜) 정의 통일**  
  `SV_days = Actual_or_Forecast_finish - Planned_finish`  
  본 보고서의 기존 **Δ(d)** 와 동일 의미로 사용한다.

- **용어 주의**: EVM의 SV(=EV−PV)는 비용/진척 데이터가 필요하므로, 본 보고서에서는 **Schedule Variance(날짜)** 로만 사용한다.
