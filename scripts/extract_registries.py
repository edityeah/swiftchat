#!/usr/bin/env python3
"""
extract_registries.py — one-time extraction from the source CSVs into
PII-safe JSON aggregates + small samples that the SwiftChat prototype can
bundle.

INPUT (these are gitignored, never committed):
  - school_202605201349.csv   (~22 MB, school master)
  - teacher_202605201348.csv  (~191 MB, teacher master)
  - StudentRegistry_20042026/StudentDetailsMst_GRNO.csv (~3.4 GB, student master)

OUTPUT (committed under src/data/registries/):
  - districts.json     — per-district aggregate counts (schools, teachers,
                          students). No PII.
  - schools_sample.json — first N schools per district, PII fields stripped
                          (no principal mobile, no Aadhaar). Limit to keep
                          the bundle reasonable.
  - aggregates.json    — top-level totals + state summary.

Rules:
  - NEVER write Aadhaar numbers, mobile numbers, parent names, or emails
    to the output. Only fields that are safe for a demo go through.
  - Counts and identifiers (district name, school name, school id) are OK.
"""

import csv, json, os, sys
from collections import defaultdict
from pathlib import Path

ROOT      = Path(__file__).parent.parent
SCHOOL    = ROOT / 'school_202605201349.csv'
TEACHER   = ROOT / 'teacher_202605201348.csv'
STUDENT   = ROOT / 'StudentRegistry_20042026' / 'StudentDetailsMst_GRNO.csv'
OUT_DIR   = ROOT / 'src' / 'data' / 'registries'
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── PII-safe school fields ────────────────────────────────────────────────
# Notably EXCLUDED: nameprincipal, mobileprincipal, latitude, longitude
SAFE_SCHOOL_FIELDS = [
    'schoolid', 'statename', 'districtid', 'district', 'blockid', 'block',
    'clusterid', 'cluster', 'village', 'school', 'schoolcategory',
    'schoolmanagement', 'lowclass', 'highclass', 'school_location',
    'school_established_year', 'isactive', 'schoolmedium_desc',
]

# Cap sample lists so the JSON stays small enough to bundle.
SAMPLE_PER_DISTRICT = 20    # schools_sample.json upper bound per district
DISTRICT_LIMIT      = 33    # safety cap

import pandas as pd

print('[1/4] reading schools…', file=sys.stderr)
schools_df = pd.read_csv(SCHOOL, low_memory=False)
# Keep only active rows (column may be 1 / 0 / True / False)
if 'isactive' in schools_df.columns:
    schools_df = schools_df[schools_df['isactive'].astype(str).str.upper().isin(['1', 'TRUE', 'YES', 'Y'])]
print(f'  → {len(schools_df):,} active schools', file=sys.stderr)

print('[2/4] reading teachers (large)…', file=sys.stderr)
# Only pull columns we need so memory stays sane
teacher_cols = ['schoolid', 'isactive', 'designation']
teachers_df = pd.read_csv(TEACHER, low_memory=False, usecols=teacher_cols)
if 'isactive' in teachers_df.columns:
    teachers_df = teachers_df[teachers_df['isactive'].astype(str).str.upper().isin(['1', 'TRUE', 'YES', 'Y'])]
print(f'  → {len(teachers_df):,} active teachers', file=sys.stderr)

teacher_count_by_school = teachers_df.groupby('schoolid').size().to_dict()

print('[3/4] reading students (3.4GB, chunked)…', file=sys.stderr)
# Stream chunks of 500k rows so we never hold all 8M+ records in memory.
# Only need DistrictId and SchoolId for counts.
student_district_count = defaultdict(int)
student_school_count   = defaultdict(int)
chunk_rows = 0
for chunk in pd.read_csv(STUDENT, low_memory=False,
                         usecols=['DistrictId', 'SchoolId', 'Status'],
                         chunksize=500_000, encoding='utf-8'):
    # Keep only active students if Status col exists
    if 'Status' in chunk.columns:
        chunk = chunk[chunk['Status'].astype(str).str.upper().isin(['1', 'ACTIVE', 'TRUE', 'Y'])]
    for did, n in chunk.groupby('DistrictId').size().items():
        student_district_count[did] += n
    for sid, n in chunk.groupby('SchoolId').size().items():
        student_school_count[sid] += n
    chunk_rows += len(chunk)
    print(f'  chunk: cumulative {chunk_rows:,} students', file=sys.stderr)
print(f'  → {chunk_rows:,} active students total', file=sys.stderr)

print('[4/4] building outputs…', file=sys.stderr)

# ─── districts.json ────────────────────────────────────────────────────────
districts = []
for (did, district), grp in schools_df.groupby(['districtid', 'district']):
    school_ids = grp['schoolid'].tolist()
    teacher_total = sum(teacher_count_by_school.get(s, 0) for s in school_ids)
    student_total = student_district_count.get(did, 0)
    districts.append({
        'districtId': int(did) if str(did).isdigit() else did,
        'name': district,
        'schools': int(len(grp)),
        'teachers': int(teacher_total),
        'students': int(student_total),
        'blocks': int(grp['block'].nunique()),
        'clusters': int(grp['cluster'].nunique()),
    })
districts.sort(key=lambda d: -d['students'])
districts = districts[:DISTRICT_LIMIT]
with (OUT_DIR / 'districts.json').open('w') as f:
    json.dump(districts, f, indent=2, ensure_ascii=False)
print(f'  wrote districts.json ({len(districts)} rows)', file=sys.stderr)

# ─── schools_sample.json ──────────────────────────────────────────────────
schools_sample = []
for district_name, grp in schools_df.groupby('district'):
    sample = grp.head(SAMPLE_PER_DISTRICT)
    for _, row in sample.iterrows():
        rec = {k: (None if pd.isna(row[k]) else row[k]) for k in SAFE_SCHOOL_FIELDS if k in row.index}
        # cast ids to plain types
        for k in ('schoolid', 'districtid', 'blockid', 'clusterid', 'school_established_year'):
            if k in rec and rec[k] is not None:
                try: rec[k] = int(rec[k])
                except (ValueError, TypeError): pass
        rec['students'] = int(student_school_count.get(rec.get('schoolid'), 0))
        rec['teachers'] = int(teacher_count_by_school.get(rec.get('schoolid'), 0))
        schools_sample.append(rec)
with (OUT_DIR / 'schools_sample.json').open('w') as f:
    json.dump(schools_sample, f, indent=2, ensure_ascii=False)
print(f'  wrote schools_sample.json ({len(schools_sample)} rows)', file=sys.stderr)

# ─── aggregates.json ──────────────────────────────────────────────────────
aggregates = {
    'totalSchools':  int(len(schools_df)),
    'totalTeachers': int(len(teachers_df)),
    'totalStudents': int(chunk_rows),
    'districtCount': int(schools_df['district'].nunique()),
    'blockCount':    int(schools_df['block'].nunique()),
    'clusterCount':  int(schools_df['cluster'].nunique()),
}
with (OUT_DIR / 'aggregates.json').open('w') as f:
    json.dump(aggregates, f, indent=2, ensure_ascii=False)
print(f'  wrote aggregates.json', file=sys.stderr)

print('done.', file=sys.stderr)
