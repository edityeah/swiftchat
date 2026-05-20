#!/usr/bin/env python3
"""Re-aggregate students (no Status filter — Status col is mostly NA) and
patch the existing districts.json / aggregates.json / schools_sample.json
in-place. No PII written.
"""
import json, sys
from collections import defaultdict
from pathlib import Path
import pandas as pd

ROOT    = Path(__file__).parent.parent
STUDENT = ROOT / 'StudentRegistry_20042026' / 'StudentDetailsMst_GRNO.csv'
OUT_DIR = ROOT / 'src' / 'data' / 'registries'

print('re-aggregating students…', file=sys.stderr)
student_district_count = defaultdict(int)
student_school_count   = defaultdict(int)
total = 0
for chunk in pd.read_csv(STUDENT, low_memory=False,
                         usecols=['DistrictId', 'SchoolId'],
                         chunksize=500_000, encoding='utf-8'):
    for did, n in chunk.groupby('DistrictId').size().items():
        student_district_count[int(did) if str(did).replace('.', '', 1).isdigit() else did] += int(n)
    for sid, n in chunk.groupby('SchoolId').size().items():
        student_school_count[int(sid) if str(sid).replace('.', '', 1).isdigit() else sid] += int(n)
    total += len(chunk)
    print(f'  cumulative {total:,}', file=sys.stderr)
print(f'  → {total:,} students total', file=sys.stderr)

# Patch districts.json
districts_path = OUT_DIR / 'districts.json'
districts = json.loads(districts_path.read_text())
for d in districts:
    did = d.get('districtId')
    d['students'] = int(student_district_count.get(did, 0) or student_district_count.get(str(did), 0))
districts.sort(key=lambda d: -d['students'])
districts_path.write_text(json.dumps(districts, indent=2, ensure_ascii=False))
print(f'  patched districts.json', file=sys.stderr)

# Patch schools_sample.json
schools_path = OUT_DIR / 'schools_sample.json'
schools = json.loads(schools_path.read_text())
for s in schools:
    sid = s.get('schoolid')
    s['students'] = int(student_school_count.get(sid, 0) or student_school_count.get(str(sid), 0))
schools_path.write_text(json.dumps(schools, indent=2, ensure_ascii=False))
print(f'  patched schools_sample.json', file=sys.stderr)

# Patch aggregates.json
agg_path = OUT_DIR / 'aggregates.json'
agg = json.loads(agg_path.read_text())
agg['totalStudents'] = int(total)
agg_path.write_text(json.dumps(agg, indent=2, ensure_ascii=False))
print(f'  patched aggregates.json (totalStudents={total:,})', file=sys.stderr)
print('done.', file=sys.stderr)
