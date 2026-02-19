| TR | Segment | From | To | Δh |
|---:|:--|:--|:--|---:|
| 1 | S1 | MZP_ETA | MZP_ALL_FAST | 0.00 |
| 1 | S2 | MZP_ALL_FAST | MZP_ETD | 98.97 |
| 1 | S3 | MZP_ETD | AGI_ALL_FAST | 91.50 |
| 1 | S4 | AGI_ALL_FAST | LOADIN_DONE | 94.53 |
| 1 | S5 | AGI_CAST_OFF | NEXT_MZP_ALL_FAST | 30.67 |
| 2 | S1 | MZP_ETA | MZP_ALL_FAST | 0.00 |
| 2 | S2 | MZP_ALL_FAST | MZP_ETD | 65.70 |
| 3 | S1 | MZP_ETA | MZP_ALL_FAST | 1.90 |
| 3 | S2 | MZP_ALL_FAST | MZP_ETD | 36.60 |

**VERIFY(누락 이벤트)**
| TR | Segment | Missing |
|---:|:--|:--|
| 2 | S3 | AGI_ALL_FAST |
| 2 | S4 | AGI_ALL_FAST,LOADIN_DONE |
| 2 | S5 | AGI_CAST_OFF |
| 3 | S3 | AGI_ALL_FAST |
| 3 | S4 | AGI_ALL_FAST,LOADIN_DONE |
| 3 | S5 | AGI_CAST_OFF |
