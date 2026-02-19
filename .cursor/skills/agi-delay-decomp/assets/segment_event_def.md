# Segment 경계(필수 Event) 정의

기준: **All Fast** = RoRo berth 완전 계류(gangway down & secured), [amsty.com](https://amsty.com/images/pdf/AmSty-Marine-Terminal-Berthing-Requirements.pdf)

| Segment | Start Event | End Event | 정의 요약 |
|---------|-------------|-----------|-----------|
| **S1** | MZP_ETA_PBP | MZP_ALL_FAST | Pilot boarding place ETA → RoRo berth all fast |
| **S2** | MZP_ALL_FAST | MZP_ETD_CAST_OFF | all fast → cast off(출항) |
| **S3** | MZP_ETD_CAST_OFF | AGI_ALL_FAST | 출항 → AGI all fast |
| **S4** | AGI_ALL_FAST | AGI_LOADIN_COMPLETE | all fast → load-in(offloading) 완료 |
| **S5** | AGI_ETD_CAST_OFF | NEXT_MZP_ALL_FAST | AGI cast off → 다음 항차 MZP all fast |

## EventKey 매핑 (기존 호환)
- MZP_ETA_PBP ≈ MZP_ETA (PBP ETA 없으면 All fast와 동일 시각 허용)
- MZP_ETD_CAST_OFF = MZP_ETD
- AGI_LOADIN_COMPLETE = LOADIN_DONE
- AGI_ETD_CAST_OFF = AGI_CAST_OFF

## 정의 문구(분쟁 방지)
- **All Fast**: 선박이 완전히 계류되고(gangway down & secured 포함) 작업 가능한 상태가 된 시점. ([amsty.com](https://amsty.com/images/pdf/AmSty-Marine-Terminal-Berthing-Requirements.pdf))
- **Cast off**: 계류줄을 풀고 출항하는 시점(Departure). ([American Sailing](https://americansailing.com/articles/40-sailing-phrases-to-know/))
