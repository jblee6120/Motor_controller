#!/usr/bin/env python3
"""Validate SYS.1 / SYS.2 requirement IDs and their single-source trace links.
Usage: python tools/validate_requirements.py
Requires: pip install pyyaml
Exit 0 if structural checks pass; reports TBD as review warnings, not errors.
"""
from __future__ import annotations
from pathlib import Path
from collections import Counter
import csv
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
STK = ROOT / 'docs/01_stakeholder/stakeholder_requirements.yaml'
SYS = ROOT / 'docs/02_system/system_requirements.yaml'
LINKS = ROOT / 'trace/links.csv'
VALID_METHODS = {'Test','Analysis','Inspection','Demonstration'}


def as_ids(items):
    return [item.get('id','') for item in items]


def main() -> int:
    errors, warnings = [], []
    with STK.open(encoding='utf-8') as f:
        stakeholder = yaml.safe_load(f)
    with SYS.open(encoding='utf-8') as f:
        system = yaml.safe_load(f)
    with LINKS.open(encoding='utf-8-sig', newline='') as f:
        links = list(csv.DictReader(f))

    stk = stakeholder['requirements']
    sys_req = system['requirements']
    stk_ids = as_ids(stk); sys_ids = as_ids(sys_req)
    stk_set, sys_set = set(stk_ids), set(sys_ids)
    for name, ids in [('STK',stk_ids),('SYS',sys_ids)]:
        dups = sorted(k for k,cnt in Counter(ids).items() if cnt>1)
        if dups:
            errors.append(f'{name}: duplicate IDs {dups}')
    for s in stk:
        if not s['id'].startswith('STK-REQ-'):
            errors.append(f"Invalid stakeholder ID: {s['id']}")
        if not s.get('need') or not s.get('priority'):
            errors.append(f"Incomplete stakeholder: {s['id']}")
    expected_links = set()
    for r in sys_req:
        rid = r['id']
        if not rid.startswith('SYS-REQ-'):
            errors.append(f'Invalid system ID: {rid}')
        if not r.get('source'):
            errors.append(f'Missing stakeholder source: {rid}')
        for ref in r.get('source', []):
            if ref not in stk_set:
                errors.append(f'Unknown stakeholder source: {rid} -> {ref}')
            expected_links.add((rid,'derived_from',ref))
        if not r.get('requirement') or not r.get('operating_environment_impact'):
            errors.append(f'Incomplete system requirement: {rid}')
        v = r.get('verification',{})
        if v.get('method') not in VALID_METHODS or not v.get('acceptance_criteria'):
            errors.append(f'Incomplete verification method/criteria: {rid}')
        open_points = r.get('open_points',[])
        pending = ('TBD' in str(v.get('acceptance_criteria'))) or ('TBD' in str(r.get('requirement'))) or bool(open_points)
        feasibility = r.get('technical_feasibility',{}).get('status')
        if not feasibility:
            errors.append(f'Missing feasibility review status: {rid}')
        if r.get('status') == 'Approved' and (pending or feasibility != 'Assessed'):
            errors.append(f'{rid}: Approved despite unresolved TBD/feasibility')
        if pending:
            warnings.append(f'{rid}: TBD/open_points pending')
        if feasibility != 'Assessed':
            warnings.append(f'{rid}: technical feasibility not assessed')

    actual_links = []
    for x in links:
        triplet=(x.get('source'),x.get('relation'),x.get('target'))
        actual_links.append(triplet)
        if x.get('source') not in sys_set or x.get('target') not in stk_set:
            errors.append(f'Link references nonexistent ID: {triplet}')
    duplinks = sorted(k for k,c in Counter(actual_links).items() if c>1)
    if duplinks:
        errors.append(f'Duplicated trace relationships: {duplinks}')
    actual_set = set(actual_links)
    if missing := expected_links-actual_set:
        errors.append(f'Missing trace links: {sorted(missing)}')
    if extraneous := actual_set-expected_links:
        errors.append(f'Unexpected/inconsistent links: {sorted(extraneous)}')

    untraced_stk = stk_set - {a[2] for a in actual_set}
    if untraced_stk:
        warnings.append(f'Stakeholder needs without SYS derivative: {sorted(untraced_stk)}')

    print(f'Project: {system["document"]["project"]}')
    print(f'SYS.1 stakeholder requirements: {len(stk)}')
    print(f'SYS.2 system requirements: {len(sys_req)}')
    print(f'Trace links (SYS -> STK): {len(links)}')
    print(f'TBD/open system requirements: {sum("TBD" in str(r.get("requirement")) or "TBD" in str(r.get("verification",{}).get("acceptance_criteria")) or bool(r.get("open_points")) for r in sys_req)}')
    print(f'Feasibility assessments pending: {sum(r["technical_feasibility"]["status"]!="Assessed" for r in sys_req)}')
    if errors:
        print('\nERRORS:')
        for error in errors:
            print('  -',error)
    else:
        print('\nStructure/ID/traceability checks: PASS')
    if warnings:
        print(f'Review warnings: {len(warnings)} (expected for draft; not printed individually)')
    if stakeholder['elicitation']['agreement'] != 'Agreed':
        print('SYS.1 agreement status: NotAgreed — SYS.2 baseline approval BLOCKED')
    return 1 if errors else 0

if __name__=='__main__':
    sys.exit(main())
