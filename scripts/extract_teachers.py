#!/usr/bin/env python3
"""Extract a PII-safe sample of teachers (~50 per district) from the master
teacher CSV. Replaces real names with synthetic Indian-style names so the
demo has realistic-looking teacher records but no actual identities leak.

Output: src/data/registries/teachers_sample.json
"""

import json, sys
from collections import defaultdict
from pathlib import Path
import pandas as pd
import random

ROOT     = Path(__file__).parent.parent
SCHOOL   = ROOT / 'school_202605201349.csv'
TEACHER  = ROOT / 'teacher_202605201348.csv'
OUT_DIR  = ROOT / 'src' / 'data' / 'registries'

# Cap per district so the bundle stays small.
SAMPLE_PER_DISTRICT = 50

# Synthetic name pools (Gujarati / pan-Indian, gender-aware).
FIRST_M = ['Aarav','Veer','Dev','Kabir','Om','Arjun','Harsh','Pranav','Jay','Siddh','Dhruv','Ishaan','Kian','Reyansh','Vivaan','Yash','Neel','Raj','Krish','Aditya','Darsh','Hemal','Jeet','Kushal','Laksh','Meet','Parth','Ruhan','Sahil','Tanay','Rakesh','Amit','Suresh','Mahesh','Nikhil','Vikram','Sunil','Anil','Sanjay','Ramesh']
FIRST_F = ['Diya','Riya','Ananya','Ishita','Komal','Nisha','Keya','Tanvi','Pooja','Sneha','Krupa','Hetal','Prisha','Myra','Aanya','Bhumi','Charmi','Isha','Khushi','Mira','Neha','Priti','Sara','Urvi','Vaishali','Zara','Riddhi','Gauri','Nidhi','Pari','Priya','Meera','Kavita','Sunita','Rekha','Anita','Sushma','Lata','Geeta','Asha']
LAST    = ['Shah','Patel','Mehta','Joshi','Trivedi','Pandya','Desai','Chauhan','Rathod','Solanki','Gohil','Parmar','Thakor','Prajapati','Vasava','Barot','Bhatt','Rao','Vaghela','Dave','Modi','Thakkar','Rajput','Raval','Jadeja','Panchal','Makwana','Dabhi','Chaudhari','Nayak','Soni','Mistry','Pathak','Sharma','Verma','Gupta','Singh','Yadav','Kumar','Jain']

# Deterministic seed so the demo is stable across rebuilds.
RNG = random.Random(20260520)

def synthetic_name(gender):
    if gender and str(gender).upper().startswith('F'):
        first = RNG.choice(FIRST_F)
    elif gender and str(gender).upper().startswith('M'):
        first = RNG.choice(FIRST_M)
    else:
        first = RNG.choice(FIRST_M + FIRST_F)
    last = RNG.choice(LAST)
    return f'{first} {last}'

# ─── Load schools (need schoolid → district + block + school name) ─────────
print('[1/3] reading schools (district/block lookup)…', file=sys.stderr)
schools_df = pd.read_csv(SCHOOL, low_memory=False,
                         usecols=['schoolid', 'district', 'block', 'cluster', 'school'])
school_lookup = schools_df.set_index('schoolid').to_dict('index')
print(f'  → {len(school_lookup):,} schools', file=sys.stderr)

# ─── Stream teachers ───────────────────────────────────────────────────────
print('[2/3] streaming teachers…', file=sys.stderr)
# Safe columns only — explicitly DO NOT read mobile / email / aadhar / dob.
SAFE_TEACHER_COLS = [
    'teachercode', 'schoolid', 'designation', 'tchgender',
    'tchpqual_desc', 'tchaqual_desc', 'tchcat_desc',
    'joiningdate', 'isactive', 'teachertype', 'cls_taught',
]

per_district = defaultdict(list)
for chunk in pd.read_csv(TEACHER, low_memory=False,
                         usecols=SAFE_TEACHER_COLS,
                         chunksize=200_000):
    # Active teachers only
    chunk = chunk[chunk['isactive'].astype(str).str.upper().isin(['1', 'TRUE', 'YES', 'Y'])]
    for _, row in chunk.iterrows():
        sid = row['schoolid']
        sch = school_lookup.get(sid)
        if not sch:
            continue
        district = sch.get('district')
        if district is None:
            continue
        bucket = per_district[district]
        if len(bucket) >= SAMPLE_PER_DISTRICT:
            continue
        bucket.append({
            'teacherCode': int(row['teachercode']) if pd.notna(row['teachercode']) else None,
            'name': synthetic_name(row.get('tchgender')),  # synthesised
            'gender': row.get('tchgender'),
            'designation': row.get('designation'),
            'category': row.get('tchcat_desc'),
            'qualification': row.get('tchpqual_desc'),
            'additionalQualification': row.get('tchaqual_desc'),
            'teacherType': row.get('teachertype'),
            'classTaught': row.get('cls_taught'),
            'joiningYear': str(row['joiningdate'])[:4] if pd.notna(row['joiningdate']) else None,
            'schoolId': int(sid) if pd.notna(sid) else None,
            'school': sch.get('school'),
            'district': district,
            'block': sch.get('block'),
            'cluster': sch.get('cluster'),
        })
    if all(len(per_district[d]) >= SAMPLE_PER_DISTRICT for d in per_district):
        # All buckets full — no need to read more of the file
        if len(per_district) >= 30:
            print(f'  early-exit: every district has {SAMPLE_PER_DISTRICT}+ teachers', file=sys.stderr)
            break
print(f'  → {sum(len(v) for v in per_district.values()):,} teachers across {len(per_district)} districts', file=sys.stderr)

# ─── Write ────────────────────────────────────────────────────────────────
print('[3/3] writing teachers_sample.json…', file=sys.stderr)
out = []
for d in sorted(per_district):
    out.extend(per_district[d])
# Sanitise: replace NaN/None with proper nulls
def clean(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except (TypeError, ValueError):
        pass
    return v
out = [{k: clean(v) for k, v in r.items()} for r in out]

with (OUT_DIR / 'teachers_sample.json').open('w') as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f'  wrote {len(out):,} rows', file=sys.stderr)
print('done.', file=sys.stderr)
