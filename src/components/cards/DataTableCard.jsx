// DataTableCard — tabular data display.
// Schema: { type:'data_table', title, columns:[{key, label, align}], rows:[{...}], annotation, chips }

import React from 'react'
import { Sparkles } from 'lucide-react'

function fmt(v) {
  if (typeof v !== 'number') return v
  if (v >= 1e7) return (v / 1e7).toFixed(1) + ' Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + ' L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toLocaleString('en-IN')
}

export default function DataTableCard({ card }) {
  const cols = Array.isArray(card.columns) ? card.columns : []
  const rows = Array.isArray(card.rows) ? card.rows : []
  return (
    <div className="rounded-2xl border border-[#D5D8DF] bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-[#F8FAFC] to-white border-b border-[#D5D8DF]">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#386AF6]">{card.title || 'Table'}</div>
        <div className="text-[10px] text-[#828996] mt-0.5">{rows.length.toLocaleString('en-IN')} row{rows.length === 1 ? '' : 's'}</div>
      </div>
      <div className="p-3">
        {card.annotation && (
          <div className="mb-3 text-[12px] text-[#475569] inline-flex items-start gap-1.5 px-2">
            <Sparkles className="w-3 h-3 mt-0.5 text-[#386AF6] flex-shrink-0" />
            <span>{card.annotation}</span>
          </div>
        )}
        <div className="overflow-x-auto" style={{ border: '1px solid #E2E8F0', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#FAFBFC', borderBottom: '1px solid #E2E8F0' }}>
                {cols.map(c => (
                  <th
                    key={c.key}
                    style={{
                      padding: '8px 12px', textAlign: c.align || 'left',
                      fontSize: 10, color: '#828996', fontWeight: 700, letterSpacing: '0.04em',
                      textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ borderTop: ri === 0 ? 'none' : '1px solid #F1F5F9' }}>
                  {cols.map(c => {
                    const v = r[c.key]
                    return (
                      <td
                        key={c.key}
                        style={{
                          padding: '8px 12px', textAlign: c.align || 'left',
                          color: '#0E0E0E', fontWeight: ri === 0 ? 600 : 500,
                          whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis',
                        }}
                      >
                        {c.format === 'number' ? fmt(v) : v ?? '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
