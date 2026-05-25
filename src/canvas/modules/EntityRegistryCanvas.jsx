import React, { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import {
  DISTRICTS, SCHOOLS, TEACHERS, AGGREGATES,
  titleCase, schoolsInDistrict, schoolsInBlock, schoolsInCluster,
  teachersInDistrict, teachersInBlock, teachersInCluster, teachersInSchool,
  aggregatesFor,
} from '../../data/registries'
import { SCHOOL_INFO } from '../../data/mockData'

const FONT = 'Montserrat, sans-serif'

// Synthesise district-level attendance / risk so the registry has tone bands.
// Deterministic per districtId; harmless if data later replaces this.
function deriveDistrictMetrics(districtId) {
  const seed = Number(districtId) || 0
  return {
    attendance:     78 + ((seed * 17) % 14),
    riskRate:       4  + ((seed * 11) % 8),
    scholarshipRate:70 + ((seed * 23) % 20),
  }
}

function attendanceTone(att) {
  if (att >= 88) return { fg: '#065F46', bg: '#D1FAE5', label: 'GOOD' }
  if (att >= 80) return { fg: '#92400E', bg: '#FEF3C7', label: 'WATCH' }
  return { fg: '#B91C1C', bg: '#FEE2E2', label: 'BELOW' }
}

// District rows (top-of-state view).
const DISTRICT_ROWS = DISTRICTS.map(d => {
  const m = deriveDistrictMetrics(d.districtId)
  return {
    _id: d.districtId,
    districtId: d.districtId,
    name: titleCase(d.name),
    schools: d.schools,
    teachers: d.teachers,
    students: d.students,
    blocks: d.blocks,
    clusters: d.clusters,
    attendance: m.attendance,
    scope: 'district',
  }
})

function buildSchoolRows(list) {
  return list.map(s => ({
    _id: s.schoolid,
    schoolid: s.schoolid,
    school: s.school,
    district: titleCase(s.district || ''),
    block: titleCase(s.block || ''),
    cluster: titleCase(s.cluster || ''),
    management: s.schoolmanagement,
    lowclass: s.lowclass,
    highclass: s.highclass,
    medium: s.schoolmedium_desc,
    students: s.students,
    teachers: s.teachers,
    established: s.school_established_year,
    scope: 'school',
  }))
}

function buildTeacherRows(list) {
  return list.map(t => ({
    _id: t.teacherCode,
    teacherCode: t.teacherCode,
    name: t.name,
    gender: t.gender,
    designation: t.designation,
    qualification: t.qualification,
    teacherType: t.teacherType,
    school: t.school,
    district: titleCase(t.district || ''),
    block: titleCase(t.block || ''),
    scope: 'teacher',
  }))
}

// ─── Column sets ────────────────────────────────────────────────────────────
const COLUMNS = {
  districts: [
    { key: 'name',       label: 'District', align: 'left',  format: v => v },
    { key: 'schools',    label: 'Schools',  align: 'right', format: v => Number(v).toLocaleString() },
    { key: 'teachers',   label: 'Teachers', align: 'right', format: v => Number(v).toLocaleString() },
    { key: 'students',   label: 'Students', align: 'right', format: v => Number(v).toLocaleString() },
    { key: 'attendance', label: 'Att. %',   align: 'right', format: v => `${Number(v).toFixed(1)}%` },
    { key: 'blocks',     label: 'Blocks',   align: 'right', format: v => Number(v).toLocaleString() },
    { key: 'clusters',   label: 'Clusters', align: 'right', format: v => Number(v).toLocaleString() },
  ],
  schools: [
    { key: 'school',     label: 'School',   align: 'left',  format: v => v },
    { key: 'district',   label: 'District', align: 'left',  format: v => v },
    { key: 'block',      label: 'Block',    align: 'left',  format: v => v },
    { key: 'management', label: 'Type',     align: 'left',  format: v => v || '—' },
    { key: 'lowclass',   label: 'From',     align: 'right', format: v => v ?? '—' },
    { key: 'highclass',  label: 'To',       align: 'right', format: v => v ?? '—' },
    { key: 'students',   label: 'Students', align: 'right', format: v => Number(v).toLocaleString() },
    { key: 'teachers',   label: 'Teachers', align: 'right', format: v => Number(v).toLocaleString() },
  ],
  teachers: [
    { key: 'name',          label: 'Name',          align: 'left',  format: v => v || '—' },
    { key: 'gender',        label: 'Gender',        align: 'left',  format: v => v || '—' },
    { key: 'designation',   label: 'Designation',   align: 'left',  format: v => v || '—' },
    { key: 'qualification', label: 'Qualification', align: 'left',  format: v => v || '—' },
    { key: 'teacherType',   label: 'Type',          align: 'left',  format: v => v || '—' },
    { key: 'school',        label: 'School',        align: 'left',  format: v => v || '—' },
    { key: 'district',      label: 'District',      align: 'left',  format: v => v || '—' },
  ],
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function HeaderStat({ label, value, color }) {
  return (
    <div style={{ padding: '8px 14px', borderRight: '1px solid #E5E7EB', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: '#828996', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color: color || '#0E0E0E', fontWeight: 700, marginTop: 2, fontFamily: FONT, whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

function compactNumber(n) {
  if (n == null) return '—'
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return Number(n).toLocaleString()
}

// ─── Canvas ────────────────────────────────────────────────────────────────
export default function EntityRegistryCanvas({ context }) {
  const { openCanvas } = useApp()
  const kind = ['districts', 'schools', 'teachers'].includes(context?.kind) ? context.kind : 'districts'
  const scope = context?.scope                              // 'district' | 'block' | 'cluster' | 'school' | undefined
  const target = context?.district || context?.block || context?.cluster || context?.school

  // Build the rows for the chosen kind+scope.
  const rows = useMemo(() => {
    if (kind === 'districts') return DISTRICT_ROWS
    if (kind === 'schools') {
      if (scope === 'district' && target) return buildSchoolRows(schoolsInDistrict(target))
      if (scope === 'block' && target)    return buildSchoolRows(schoolsInBlock(target))
      if (scope === 'cluster' && target)  return buildSchoolRows(schoolsInCluster(target))
      return buildSchoolRows(SCHOOLS)
    }
    if (kind === 'teachers') {
      if (scope === 'school' && context?.schoolId) return buildTeacherRows(teachersInSchool(context.schoolId))
      if (scope === 'school') {
        // Principal scope — no real schoolId mapping yet, so we take a
        // believable school-sized slice from the district sample.
        const district = context?.district
        const cap = context?.teacherCount || SCHOOL_INFO.totalTeachers || 18
        return buildTeacherRows(teachersInDistrict(district).slice(0, cap))
      }
      if (scope === 'district' && target) return buildTeacherRows(teachersInDistrict(target))
      if (scope === 'block' && target)    return buildTeacherRows(teachersInBlock(target))
      if (scope === 'cluster' && target)  return buildTeacherRows(teachersInCluster(target))
      return buildTeacherRows(TEACHERS)
    }
    return []
  }, [kind, scope, target, context?.schoolId])

  // Sort + filter UI state
  const defaultSort = kind === 'districts' ? 'students' : kind === 'schools' ? 'students' : 'name'
  const [sortKey, setSortKey] = useState(defaultSort)
  const [sortAsc, setSortAsc] = useState(kind === 'teachers')
  const [filter, setFilter] = useState('')

  const cols = COLUMNS[kind]

  const displayRows = useMemo(() => {
    const filtered = filter
      ? rows.filter(r => {
          const hay = [r.name, r.school, r.district, r.block, r.cluster, r.designation, r.gender].filter(Boolean).join(' ').toLowerCase()
          return hay.includes(filter.toLowerCase())
        })
      : rows
    return [...filtered].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey]
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va
      return sortAsc
        ? String(va ?? '').localeCompare(String(vb ?? ''))
        : String(vb ?? '').localeCompare(String(va ?? ''))
    })
  }, [rows, sortKey, sortAsc, filter])

  function setSort(key) {
    if (sortKey === key) setSortAsc(s => !s)
    else { setSortKey(key); setSortAsc(false) }
  }

  function onRowClick(r) {
    if (kind === 'districts') {
      openCanvas({ type: 'registry', kind: 'schools', scope: 'district', district: r.name })
    } else if (kind === 'schools') {
      openCanvas({ type: 'registry', kind: 'teachers', scope: 'school', schoolId: r.schoolid, schoolName: r.school })
    } else if (kind === 'teachers') {
      // Open the role-aware teacher profile. The `from*` fields let the
      // profile's back arrow restore exactly this registry view.
      openCanvas({
        type: 'teacher-profile',
        teacherCode: r.teacherCode,
        teacherName: r.name,
        from: 'registry',
        fromScope: scope,
        fromSchoolId: context?.schoolId,
        fromDistrict: context?.district,
        fromBlock: context?.block,
        fromCluster: context?.cluster,
      })
    }
  }

  // Header stats — change based on scope.
  let agg
  if (scope === 'school') {
    agg = aggregatesFor('school', {
      schoolName: context?.schoolName || 'School',
      teachers: displayRows.length,
      students: context?.studentCount ?? SCHOOL_INFO.totalStudents,
    })
  } else if (scope && target) {
    agg = aggregatesFor(scope, target)
  } else {
    agg = { schools: AGGREGATES.totalSchools, teachers: AGGREGATES.totalTeachers, students: AGGREGATES.totalStudents, label: 'Gujarat' }
  }

  const titleNoun =
    kind === 'districts' ? (displayRows.length === 1 ? 'district' : 'districts') :
    kind === 'schools'   ? (displayRows.length === 1 ? 'school'   : 'schools')   :
                           (displayRows.length === 1 ? 'teacher'  : 'teachers')

  const scopeLabel =
    scope === 'school' && context?.schoolName ? `at ${context.schoolName}` :
    scope && target ? `in ${titleCase(target)}` :
    ''

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#FFFFFF', fontFamily: FONT }}>
      <div className="p-5">
        {/* Title */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#828996', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {scope && target ? scopeLabel.replace(/^(at|in) /, '') : 'State of Gujarat'}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0E0E0E', lineHeight: '26px', marginTop: 2 }}>
          {displayRows.length.toLocaleString()} {titleNoun}
          {kind === 'schools' && !scope && (
            <span style={{ fontSize: 13, color: '#828996', fontWeight: 500 }}> (sample from {compactNumber(AGGREGATES.totalSchools)})</span>
          )}
        </h2>

        {/* Top stats strip */}
        <div className="mt-4 flex" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
          <HeaderStat label="Schools"  value={Number(agg.schools  ?? 0).toLocaleString()} />
          <HeaderStat label="Teachers" value={Number(agg.teachers ?? 0).toLocaleString()} />
          <HeaderStat label="Students" value={compactNumber(agg.students)} />
          {agg.blocks != null && <HeaderStat label="Blocks" value={Number(agg.blocks).toLocaleString()} />}
          {agg.clusters != null && (
            <div style={{ padding: '8px 14px', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: '#828996', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Clusters</div>
              <div style={{ fontSize: 16, color: '#0E0E0E', fontWeight: 700, marginTop: 2 }}>
                {Number(agg.clusters).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder={
              kind === 'districts' ? 'Search district…' :
              kind === 'schools'   ? 'Search school, district, block…' :
                                     'Search teacher, designation, school…'
            }
            className="w-full outline-none"
            style={{
              padding: '9px 14px', borderRadius: 999,
              border: '1px solid #D5D8DF', background: '#FFFFFF',
              fontSize: 13, color: '#0E0E0E', fontFamily: FONT,
            }}
          />
        </div>

        {/* Table */}
        <div className="mt-3" style={{ border: '1px solid #D5D8DF', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #D5D8DF' }}>
                {cols.map(c => (
                  <th
                    key={c.key}
                    onClick={() => setSort(c.key)}
                    style={{
                      padding: '10px 12px',
                      textAlign: c.align,
                      fontWeight: 700,
                      fontSize: 11,
                      color: sortKey === c.key ? '#386AF6' : '#828996',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {c.label} {sortKey === c.key ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
                {/* Spacer header to match the trailing "Open profile" cell. */}
                {(kind === 'teachers' || kind === 'schools') && <th style={{ padding: '10px 12px' }}></th>}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, idx) => {
                const tone = kind === 'districts' ? attendanceTone(r.attendance) : null
                // Teachers, districts AND schools all open something on click.
                // Leaves before this change were teachers — they're not anymore.
                const isClickable = ['districts', 'schools', 'teachers'].includes(kind)
                return (
                  <tr
                    key={r._id ?? idx}
                    onClick={() => onRowClick(r)}
                    className="entity-row"
                    style={{
                      borderBottom: idx === displayRows.length - 1 ? 'none' : '1px solid #F1F5F9',
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    {cols.map(c => {
                      const isAtt = c.key === 'attendance'
                      // Render the "Name" column as a primary-blue link so it
                      // looks like an obvious click target.
                      const isNameCol = c.key === 'name' && kind === 'teachers'
                      return (
                        <td
                          key={c.key}
                          style={{
                            padding: '10px 12px',
                            textAlign: c.align,
                            color: isNameCol ? '#386AF6' : '#0E0E0E',
                            fontWeight: ['name','school'].includes(c.key) ? 700 : 500,
                            fontFamily: FONT,
                            whiteSpace: 'nowrap',
                            maxWidth: c.key === 'school' || c.key === 'qualification' ? 220 : undefined,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: isNameCol ? 'underline' : 'none',
                            textDecorationColor: isNameCol ? '#C7D2FE' : undefined,
                            textUnderlineOffset: isNameCol ? '3px' : undefined,
                          }}
                        >
                          {isAtt && tone ? (
                            <span style={{
                              display: 'inline-block', padding: '2px 8px',
                              borderRadius: 999, fontSize: 11, fontWeight: 700,
                              background: tone.bg, color: tone.fg,
                            }}>
                              {c.format(r[c.key])}
                            </span>
                          ) : c.format(r[c.key])}
                        </td>
                      )
                    })}
                    {/* Trailing "Open profile" affordance for teacher rows. */}
                    {kind === 'teachers' && (
                      <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700,
                          padding: '4px 10px', borderRadius: 999,
                          background: '#EEF2FF', color: '#3730A3',
                          border: '1px solid #C7D2FE',
                          display: 'inline-block',
                        }}>
                          Open profile ›
                        </span>
                      </td>
                    )}
                    {/* For school rows — row click still drills into teachers
                        (existing UX). The explicit "School profile" chip lets
                        the user jump to the school's deep-dive instead. */}
                    {kind === 'schools' && (
                      <td style={{ padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            openCanvas({
                              type: 'school-profile',
                              schoolId: r.schoolid,
                              schoolName: r.school,
                              from: 'registry',
                              fromScope: scope,
                              fromDistrict: context?.district,
                              fromBlock: context?.block,
                              fromCluster: context?.cluster,
                            })
                          }}
                          style={{
                            fontSize: 10.5, fontWeight: 700,
                            padding: '4px 10px', borderRadius: 999,
                            background: '#EEF2FF', color: '#3730A3',
                            border: '1px solid #C7D2FE',
                            cursor: 'pointer', fontFamily: FONT,
                          }}
                        >
                          School profile ›
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Row hover style applied via a scoped <style> block (works in JSX
            without needing a CSS file). */}
        <style>{`
          .entity-row:hover { background: #F8FAFC; }
        `}</style>

        {displayRows.length === 0 && (
          <div className="mt-3 text-center" style={{ color: '#7383A5', fontSize: 13, padding: 16 }}>
            No matches.
          </div>
        )}

        <div className="mt-3" style={{ fontSize: 11, color: '#828996', lineHeight: '16px' }}>
          Source: VSK Gujarat master tables (counts and identifiers only; PII fields are not loaded).
          {kind === 'districts' && ' Click a district to see its schools.'}
          {kind === 'schools' && ' Click a school to see its teachers.'}
          {kind === 'teachers' && ' Click any row (or the underlined teacher name) to open the full profile. Names are synthetic placeholders for the prototype.'}
        </div>
      </div>
    </div>
  )
}
