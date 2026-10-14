# Project Charter — c1-referenced Motor Controller Rev.A

| 구분 | 값 |
|---|---|
| 문서 ID | `PRJ-CHARTER-001` |
| 프로젝트 ID | `MCTRL-C1-RA` |
| 문서 상태 / 개정 | `Draft / 0.1` |
| 작성 기준일 | `2026-10-12` |
| 책임자 / 승인자 | `TBD` (개인 개발 프로젝트의 제품 책임자·개발자) |
| 프로세스 대응 | **MAN.3** (프로젝트 기획) + **SYS.1** (요구 출처 및 범위 정의 연계) |
| 레퍼런스 제품 | `mjbots moteus c1` — 선정됨 |
| 레퍼런스 HW Revision / Git Commit | `TBD / TBD` (설계 참조 기준선은 **아직 미고정**) |
| 자체 개발 목표 형상 | `HW Rev.A / FW TBD / Motor TBD` |

> **문서 해석 원칙**: 본 Charter는 프로젝트 관리·제품 비전을 위한 문서이다. ASPICE 4.0 SYS.1의 개별 이해관계자 요구사항은 `../01_stakeholder/stakeholder_requirements.yaml`, SYS.2는 `../02_system/system_requirements.yaml`에 별도 기록한다. 이 문서와 요구사항은 현재 승인된 제품 사양이 아니라 **초안**이다.

## 1. 배경 및 개발 목적

mjbots의 공개 moteus c1 회로/PCB/펌웨어를 기술 레퍼런스로 삼아, **직접 설계·제작한 PCB와 직접 관리하는 펌웨어**로 3상 PMSM/BLDC의 폐루프 구동을 구현한다. 하드웨어·소프트웨어·제어기·시뮬레이션·검증 데이터를 일관된 형상 및 요구사항 추적 체계로 관리하여 반복 개발이 가능한 모터제어기 플랫폼을 확보한다.

### 1.1 제품 목표 — Rev.A (제안, SYS.2 승인 전)

1. 단일 3상 PMSM/BLDC 모터 구동 보드를 직접 제작한다.
2. 위치 센서 기반 FOC 및 전류/속도/위치 제어를 구현한다.
3. CAN FD로 구동 명령을 받고 상태·진단 정보를 반환한다.
4. 전력회로·피드백·통신 이상에 대한 진단 및 출력 제어 동작을 구현한다.
5. 실제 모터 구동 시험과 MATLAB/Simulink 기반 모델 시험 결과를 비교·기록한다.
6. 회로도, BOM, PCB, 소스코드, 시험 결과를 요구사항과 양방향으로 추적 가능하게 관리한다.

### 1.2 비목표 및 제외 범위 (Rev.A 기본값; 변경 가능)

- c1의 모든 부품, 인터페이스, 기구 치수 또는 공식 펌웨어와의 **완전 호환** 보장은 제외.
- 양산 제조 검증, 차량 탑재, 기능안전(ISO 26262) 적합성 및 Automotive SPICE 공식 역량 평가/인증은 제외.
- Sensorless FOC, Field Weakening, 고급 임피던스 제어, 다축 동기 제어, OTA/FOTA는 기본 제외.
- 과부하·고출력·장시간 운전 조건은 요구사항과 시험 설비를 갖춘 뒤 단계적으로 결정.
- 외부 장치에 대한 인간 안전(기계적인 정지·비상정지) 보증은 제외. 필요한 경우 별도 시스템 안전 설계 필요.

## 2. 기준 시스템 경계 / 운영 환경

```text
외부 DC 전원 (정격 TBD) ───> [자체 개발 Motor Controller Rev.A] ───> 3상 모터 (모델 TBD)
                                       │              ▲
외부 CAN FD Host <───────────────────────┤              │ 전류/위치 피드백
                                       ├── Encoder (선정 TBD)
개발 PC ── SWD / 디버깅 ────────────────┤
                                       └── 상태 관측/설정/진단

외부 구성요소: 전원 공급기, CAN 인터페이스, PC, 모터, 부하/시험 지그, 계측 장비.
```

**경계 밖 책임**: 외부 DC 전원 보호·전원 차단 설비, 시험 지그의 기계적 안전, 호스트 명령 생성, 모터 및 부하 자체는 별도 시스템 요소로 관리한다. 모터제어기에 필요한 전압/전류/타임아웃 등 인터페이스 제한은 SYS.2에서 명시한다.

## 3. Stakeholder 및 주요 관심사

| 이해관계자 ID | 역할 | 기대 및 관점 | 동의 상태 |
|---|---|---|---|
| `STK-OWNER` | 개발자 / 제품 책임자 | 실제 구동 가능한 자체 보드·펌웨어·학습 및 추적성 | `TBD` |
| `STK-OPR` | 개발/시험 운영자 | 계측·Bring-up·Fault 복구·디버깅 편의 | `TBD` |
| `STK-HOST` | 상위제어기 개발자(가상 역할) | 명령/응답 인터페이스와 통신 상실 시 동작 | `TBD` |
| `STK-MFG` | PCB 제작/조립자(가상 역할) | 생산 데이터, 부품 명세 및 조립 가능성 | `TBD` |

요구사항 수집의 1차 출처는 프로젝트 컨셉과 사용자 확정사항(moteus c1 레퍼런스)이다. 개별 요구사항은 아직 인터뷰·검토 승인된 사항이 아니므로 `elicitation_status: Proposed`로 둔다.

## 4. 레퍼런스 사실 (자체 제품 목표가 아님)

| 항목 | 공식 moteus c1 레퍼런스 정보 | 자체 Rev.A 목표 |
|---|---|---|
| 입력 전압 | 10–51 V (명목 24 V) | `TBD` |
| Peak phase current | 20 A | `TBD` |
| 상전류 연속 정격 | 비냉각 5 A / 냉각 14 A (제조사 제시) | `TBD` |
| Peak electrical power | 250 W @ 28 V (제조사 제시 조건) | `TBD` |
| 마이크로컨트롤러 | STM32G4 계열, 170 MHz | `TBD` (계열 후보) |
| CAN FD | 제조사 기준 최대 5 Mbps | `TBD` (CAN FD 채택 제안) |
| 기판 치수 | 38 × 38 × 9 mm | `TBD` |

참고: [moteus 저장소](https://github.com/mjbots/moteus), [moteus c1 제품 페이지](https://mjbots.com/products/moteus-c1), [Hardware Specifications](https://mjbots.github.io/moteus/reference/hardware/). **레퍼런스의 최대정격·피크값을 시험 조건이나 자체 제작품의 안전한 운용 한계로 간주하지 않는다.**

## 5. 개발 방법론 / 형상·요구사항 관리

- 적용 프레임워크: Automotive SPICE® 4.0을 참고한 **경량 반복형 V-Model**. 적합성 평가 수행을 주장하지 않음.
- 요구사항: SYS.1 제안 요구 → SYS.2 시스템 요구 → SYS.3 할당 → HWE/SWE 요구/설계 → TC(시험 명세) → RUN(실행 증거).
- 작업 관리: GitHub Issues 및 마일스톤; Notion 사용 시 대시보드·링크 전용.
- 단일 원본: Markdown / YAML / CSV / KiCad / C / Simulink 파일을 Git으로 관리. 단일 진실 공급원(SSOT)은 Git.
- 연결: `trace/links.csv`(도출·검증 관계), `tools/validate_requirements.py`(정합성 검사).
- 승인 규칙: SYS.2 요구사항의 `TBD` 검증 조건, 영향/실현가능성 미평가 상태는 **Approved 상태로 전환 금지**.
- 변경 규칙: 변경 시 Issue/CR, 영향받는 요구사항·설계·시험, Git Commit, 재시험 판단 기록.
- 라이선스: moteus의 Apache-2.0 고지, 필요한 LICENSE/NOTICE 및 수정 사항 기록; 타사 라이브러리 조건 별도 확인.

## 6. 개발 마일스톤 / Exit Criteria

| 마일스톤 | 주요 활동 | 통과 조건(잠정) | 목표일 |
|---|---|---|---|
| `M0` Scope Baseline | 모터 선택, c1 HW revision/commit 고정, SYS.1·SYS.2 검토 | 핵심 요구사항 및 TBD 처분 계획 합의 | `TBD` |
| `M1` Architecture Baseline | SYS.3 / HWE.1 / SWE.1 및 인터페이스 | 주요 기능·보호책임 할당과 실현가능성 분석 완료 | `TBD` |
| `M2` HW Fabrication Baseline | 회로도, 계산서, BOM, ERC/DRC, 제조 데이터 | Design Review 및 안전한 Bring-up 절차 승인 | `TBD` |
| `M3` Board Bring-up | 전원→MCU/SWD→PWM/Gate→센싱→CAN/엔코더 | 정해진 테스트를 안전하게 통과 | `TBD` |
| `M4` Closed-loop Control | FOC, 전류/속도/위치, SiL/실기기 검증 | 제어 성능 기준 충족, Fault 처리 확인 | `TBD` |
| `M5` Rev.A Verification | 시스템 요구사항 검증, 결과/형상 동결 | Must 요구사항 모두 PASS/예외 승인, Traceability 완성 | `TBD` |

## 7. 완료 정의(Definition of Done) — 제안

- `Must`로 승인된 시스템 요구사항의 검증 결과가 대응 **HW Rev / FW Commit / 모터/설정 / 계측조건**과 함께 기록될 것.
- 시스템 요구사항 ↔ 이해관계자 요구사항, 설계 ↔ 시험 간 유효한 연결이 있을 것.
- HW 회로도·PCB·BOM·제조 데이터와 SW 실행 파일·소스코드·생성 설정을 재현할 수 있을 것.
- 고장 대응·전원 전이·구동 명령 등 핵심 시나리오의 통합 검증 증거가 있을 것.
- 잔여 결함, 안전 제한 및 사용 금지 조건을 Release Note에 명시할 것.

## 8. 위험 및 대응 계획(초안)

| 위험 ID | 위험 | 완화 방안 | 상태 |
|---|---|---|---|
| `RISK-001` | 높은 전력 단계에서 보드 파손·화재·모터 오동작 | 제한전류 전원, 보호 장치, 모터 분리 단계, 저에너지 Bring-up | Open |
| `RISK-002` | c1 원본과 자체 PCB 인터페이스 불일치 | 참조 revision 고정, 핀맵/펌웨어 차이 표 작성 | Open |
| `RISK-003` | 신규 게이트 드라이버·센싱 회로에 따른 FW 재작업 | HW/SW 인터페이스 정의 및 초기 개발보드 검증 | Open |
| `RISK-004` | 제작 지연·부품 단종 | 대체부품 후보, 발주 전 BOM 수급 확인 | Open |
| `RISK-005` | 요구사항 문서화가 개발을 지연 | Must 우선순위와 마일스톤 단위 베이스라인 | Open |
| `RISK-006` | 시뮬레이션과 실기기 응답 차이 | 실측 Rs/Ld/Lq/Ke/J, 센싱/전압 한계로 모델 갱신 | Open |

## 9. 즉시 결정해야 하는 Open Questions

| 결정 ID | 질문 | 현재 상태 | 요구사항 파급 |
|---|---|---|---|
| `DEC-001` | 대상 모터 모델, 극쌍수, 전기·기계 정격은? | `TBD` | SYS-REQ 전력/제어/센서 |
| `DEC-002` | 목표 입력전압, 상전류 정격/피크·지속 시간은? | `TBD` | 전력부, 보호 임계값 |
| `DEC-003` | 정확한 c1 보드 리비전·원본 Git SHA는? | `TBD` | 레퍼런스·라이선스 기준선 |
| `DEC-004` | 엔코더 종류/해상도/커넥터는? | `TBD` | 센서·기구·제어 성능 |
| `DEC-005` | CAN FD 프로토콜: moteus 호환 vs 독자 프로토콜? | `TBD` | SYS/SWE 인터페이스 |
| `DEC-006` | 정지 시 물리 동작: coast / brake / controlled stop? | `TBD` | 보호 로직 및 시스템 시험 |
| `DEC-007` | PCB 크기·예산·계측 장비·환경 조건은? | `TBD` | 설계 가능성·성능 |
| `DEC-008` | MCU, PWM 주기, RTOS, 코드 생성 적용 범위? | `TBD` (아키텍처 단계 결정) | HWE/SWE 상세설계 |

## 10. 인용/참조

- Automotive SPICE 4.0 PAM: https://vda-qmc.de/wp-content/uploads/2023/12/Automotive-SPICE-PAM-v40.pdf
- moteus 공식 저장소: https://github.com/mjbots/moteus
- moteus c1 공식 정보: https://mjbots.com/products/moteus-c1
- moteus Hardware Specifications: https://mjbots.github.io/moteus/reference/hardware/
- 레퍼런스 오픈소스 라이선스: https://github.com/mjbots/moteus/blob/main/LICENSE

## 11. 검토 및 승인 기록

| 개정 | 날짜 | 변경 사항 | 검토/승인 |
|---|---|---|---|
| 0.1 | 2026-10-12 | 초안 생성, 제품 목표 및 미결정 사항 분리 | `TBD` |
