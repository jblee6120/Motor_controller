# SYS.2 요구사항 리뷰 체크리스트

| 항목 | 상태 | 설명 |
|---|---|---|
| SYS.1 이해관계자 요구사항 합의 | `TBD` | `stakeholder_requirements.yaml` 은 아직 Proposed |
| SYS.2 요구사항 명확·단일 의미 | `Open` | 한 요구사항에 독립적 결과가 두 개 이상이면 분할 |
| 정량 한계·시험조건 확정 | `Open` | `TBD` 미해결 요구는 승인하지 않음 |
| 기술 실현 가능성(전압/전류/열/CPU) 분석 | `Open` | 회로·모터·스케줄링 추정과 근거 링크 |
| 운용 환경·상위 시스템 영향 검토 | `Open` | 전원/모터/호스트/회생/정지 영향 분석 |
| 요구사항 우선순위 검토 | `Open` | Must/Should/Could 범위 합의 |
| SYS.1 ↔ SYS.2 추적성 / 일관성 확인 | `Open` | `python tools/validate_requirements.py` |
| 이해관계자 리뷰 및 결과 통지 | `Open` | 리뷰어, 날짜, 이슈, 승인/보류 처분 기록 |
| Baseline/Tag 생성 | `Blocked` | 위 필수 조건 해결 후 수행 |

## 권장 Review Record 템플릿

```yaml
review_id: RVW-SYS2-001
reviewed_document: SYS2-SRS-001
review_version: 0.1
reviewer: TBD
date: TBD
result: Pending
open_issues: []
resolution_due: TBD
baseline_tag: TBD
```

## Validation 시점

- 요구사항 변경 PR마다 ID 중복, 출처 부재, 링크 오류, TBD/Approved 충돌 점검.
- 각 Milestone의 Baseline 전에 문서 리뷰와 기술적 실현가능성 근거 확인.
- `TC-SYS-*` 설계 완료 후 test-case coverage 확인(현재 SYS.5 시험 명세는 미작성 상태).

주의: 단일 개발자의 자체검토로 운영할 수 있으나, 이 자료만으로 A-SPICE Capability Level을 주장할 수 없다.
