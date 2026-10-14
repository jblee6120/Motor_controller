#!/usr/bin/env python3
"""Regenerate read-only SYS.2 review view from the YAML single source of truth."""
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[1]
src=ROOT/'docs/02_system/system_requirements.yaml'
tgt=ROOT/'docs/02_system/system_requirements_review.md'
raw=yaml.safe_load(src.read_text(encoding='utf-8'))
req=raw['requirements']
category_labels={
'functional':'기능','electrical':'전기','interface':'인터페이스','performance':'성능',
'safety_related':'보호/고장','diagnostic':'진단','maintainability':'유지보수',
'environmental':'환경','physical':'기구'
}
L=['# System Requirements Specification — 검토용 렌더링',
'','> **자동 생성 문서**: 원본은 `system_requirements.yaml`입니다. 이 Markdown을 직접 수정하지 마세요. `python tools/render_review.py`로 재생성하세요.',
'',f'- 문서: `{raw["document"]["id"]}` / Version `{raw["document"]["version"]}` / **Draft**',
'- 대상: `MCTRL-C1-RA` (moteus c1 *reference*, 자체 HW Rev.A)',
'- 중요: 모든 수치 `TBD`와 기술 실현가능성 미평가는 승인 전 해결 필요.',
'',f'**총 {len(req)}개 시스템 요구사항 — 전부 Draft**','',
'| ID | 범주 | 요구사항 | 상위 요구사항 | 미해결 |',
'|---|---|---|---|---|']
for r in req:
    ids=', '.join(f'`{x}`' for x in r['source'])
    open_='TBD' if r['open_points'] or 'TBD' in r['requirement'] else '분석 대기'
    statement=r['requirement'].replace('|','\\|')
    L.append(f'| [{r["id"]}](#{r["id"].lower()}) | {category_labels.get(r["category"],r["category"])} | {statement} | {ids} | {open_} |')
L.extend(['','---',''])
for r in req:
    v=r['verification']
    L.extend([f'### {r["id"]} — {r["title"]}','',f'**요구사항:** {r["requirement"]}','',
              f'- 상위 SYS.1: {", ".join(r["source"])}',f'- 우선순위/상태: {r["priority"]} / {r["status"]}',
              f'- 검증 방법: {v["method"]}',f'- 합격 기준: {v["acceptance_criteria"]}',
              f'- 운용환경 영향: {r["operating_environment_impact"]}',
              f'- 기술적 실현가능성: {r["technical_feasibility"]["status"]}'])
    if r['open_points']:
        L.append('- 미결정 사항: '+ ' / '.join(r['open_points']))
    L.append('')
tgt.write_text('\n'.join(L)+'\n',encoding='utf-8')
print('Wrote',tgt,'requirements',len(req))
