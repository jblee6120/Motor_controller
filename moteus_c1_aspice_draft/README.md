# MCTRL-C1-RA — A-SPICE 4.0 경량 SYS.1/SYS.2 시작 패키지

이 패키지는 `moteus c1`을 레퍼런스로 하는 **자체 HW Rev.A 모터제어기** 개발을 위한 Draft 산출물입니다.

## 시작할 문서

1. `docs/00_project/project_charter.md`: Project Charter (MAN.3 계획; SYS.1과 연계)
2. `docs/01_stakeholder/stakeholder_requirements.yaml`: SYS.1 이해관계자 요구사항 제안
3. `docs/02_system/system_requirements.yaml`: SYS.2 시스템 요구사항 초안
4. `docs/02_system/system_requirements_review.md`: SYS.2 읽기용 자동 생성 문서 (원본은 YAML)
5. `trace/links.csv`: SYS 요구사항 → STK 요구사항의 도출 관계
6. `docs/02_system/sys2_review_checklist.md`: SYS.2 리뷰/승인 기준
7. `tools/validate_requirements.py`: ID·출처·링크·TBD/승인 상태 검사

## 사용 순서

```bash
pip install pyyaml
python tools/validate_requirements.py
python tools/render_review.py
```

문서 내 `TBD`는 정상입니다. 요구사항 검토가 끝나기 전까지 `Draft`로 유지하세요.

## 꼭 알아야 할 사항

- **moteus c1 공식 사양은 자체 제품의 요구사항이 아닙니다.** 원본 사양은 Charter의 비교표에만 넣었습니다.
- `HW Rev.A`는 자체 개발 보드 목표 이름이며, 참조할 moteus c1의 정확한 **하드웨어 리비전과 Commit은 아직 TBD**입니다.
- 시스템 요구사항은 승인 전 초안입니다. `TBD`를 채우고 시험 가능성/실현가능성을 검토한 뒤 Baseline 하세요.
- SYS.1은 이해관계자 요구사항 수집 과정이고 Project Charter는 주로 MAN.3 성격입니다.
- A-SPICE 4.0 형식을 참고한 프로젝트 운영 산출물이며 **공식 프로세스 평가/인증을 의미하지 않습니다.**

## 이후 확장 구조 (현재는 미생성)

- `docs/02_system/system_architecture.md` — SYS.3
- `docs/03_hardware/` — HWE.1~4
- `docs/04_software/` — SWE.1~6
- `hw/`, `sw/`, `sim/`, `tests/`, `release/` — 구현 및 검증

## 형상/ID 정책

- `STK-REQ-NNN`: SYS.1 제안 요구
- `SYS-REQ-NNN`: SYS.2 시스템 요구
- 관계의 원본: `trace/links.csv` (`SYS-REQ-NNN,derived_from,STK-REQ-NNN`)
- 개별 요구사항 ID는 재사용 금지. 폐기 시 제거하지 않고 `Obsolete`로 전환.
- 검증 사례/결과(`TC-`, `RUN-`)는 SYS.4/5 검증 설계 시 추가.

## 출처

- https://github.com/mjbots/moteus
- https://mjbots.com/products/moteus-c1
- https://mjbots.github.io/moteus/reference/hardware/
- https://vda-qmc.de/wp-content/uploads/2023/12/Automotive-SPICE-PAM-v40.pdf
