import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const FORMATS = [
  { id: 'pdf',  icon: '📄', label: 'Export as PDF',  desc: 'Full report with charts & tables',    color: 'text-danger',  bg: 'bg-danger-light'  },
  { id: 'csv',  icon: '📊', label: 'Export as CSV',  desc: 'Raw data for Excel / Google Sheets',  color: 'text-ok',      bg: 'bg-ok-light'      },
  { id: 'json', icon: '{ }',label: 'Export as JSON', desc: 'Structured data for developers',      color: 'text-primary', bg: 'bg-primary-light' },
]

export default function ExportOptions({ context }) {
  const { showToast } = useApp()
  const [exporting, setExporting] = useState(null)

  const doExport = id => {
    setExporting(id)
    setTimeout(() => {
      setExporting(null)
      showToast(`${id.toUpperCase()} exported ✓`, 'ok')
    }, 1600)
  }

  const doPrint = () => {
    showToast('Opening print dialog…', 'info')
    setTimeout(() => window.print(), 400)
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="font-bold text-[14px] text-txt-primary border-b border-bdr pb-2 mb-3">Export &amp; Print</h3>

      {/* Print */}
      <button
        onClick={doPrint}
        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-primary text-primary bg-primary-light active:bg-primary active:text-white transition-colors group"
      >
        <span className="text-2xl">🖨</span>
        <div className="text-left">
          <div className="text-[13px] font-bold">Print to PDF</div>
          <div className="text-[11px] opacity-70">Current view as printable report</div>
        </div>
      </button>

      <div className="border-t border-bdr my-1" />

      {FORMATS.map(fmt => (
        <button
          key={fmt.id}
          onClick={() => doExport(fmt.id)}
          disabled={!!exporting}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-bdr bg-white hover:border-primary transition-all active:opacity-80 disabled:opacity-60"
        >
          <div className={`w-10 h-10 rounded-xl ${fmt.bg} flex items-center justify-center text-base ${fmt.color} font-bold flex-shrink-0`}>
            {fmt.icon}
          </div>
          <div className="text-left flex-1">
            <div className="text-[13px] font-bold text-txt-primary">{fmt.label}</div>
            <div className="text-[11px] text-txt-secondary">{fmt.desc}</div>
          </div>
          {exporting === fmt.id && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </button>
      ))}

      <p className="text-[11px] text-txt-tertiary text-center pt-2 border-t border-bdr-light">
        Exports include current session data.<br />All processing is done locally.
      </p>
    </div>
  )
}
