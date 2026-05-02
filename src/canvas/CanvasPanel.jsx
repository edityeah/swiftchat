import React from 'react'
import { X, ArrowLeft, MoreHorizontal } from 'lucide-react'
import { useApp } from '../context/AppContext'
import AttendanceCanvas  from './modules/AttendanceCanvas'
import DashboardCanvas   from './modules/DashboardCanvas'
import DataEntryCanvas   from './modules/DataEntryCanvas'
import PDFCanvas         from './modules/PDFCanvas'
import ReportCanvas      from './modules/ReportCanvas'
import DigiVrittiCanvas  from './modules/DigiVrittiCanvas'
import InterventionCanvas from './modules/InterventionCanvas'
import LessonPlanCanvas        from './modules/LessonPlanCanvas'
import WorksheetTemplateCanvas from './modules/WorksheetTemplateCanvas'
import WorksheetEditorCanvas   from './modules/WorksheetEditorCanvas'
import StudentRosterCanvas     from './modules/StudentRosterCanvas'
import AtRiskStudentsCanvas    from './modules/AtRiskStudentsCanvas'
import ClassReportCanvas       from './modules/ClassReportCanvas'
// Legacy canvas tabs (fallback for old chatId-based canvas)
import RichTextEditor    from './RichTextEditor'
import DataForm          from './DataForm'
import ActivityLog       from './ActivityLog'
import ExportOptions     from './ExportOptions'
import NotificationCanvas from '../components/notifications/NotificationCanvas'

// Module type → metadata
const SCHEME_TITLE = {
  namo_lakshmi: 'Namo Lakshmi',
  namo_saraswati: 'Namo Saraswati',
}

const MODULE_META = {
  attendance:  { icon: '📅', title: ctx => `Attendance — ${ctx.classId || 'Class 6-B'}` },
  dashboard:   { icon: '📊', title: ctx => ctx.scope === 'district' ? 'District Dashboard' : ctx.scope === 'school' ? 'School Dashboard' : 'Class Dashboard' },
  'data-entry':{ icon: '👤', title: () => 'Student Data Entry' },
  intervention:{ icon: '🎯', title: ctx => ctx.groupName || 'Intervention Group' },
  'lesson-plan':         { icon: '📚', title: ctx => ctx.title || `Lesson Plan${ctx.topic ? ` — ${ctx.topic}` : ''}` },
  'worksheet-template':  { icon: '🎨', title: () => 'Choose a Design Template' },
  'worksheet-editor':    { icon: '📝', title: ctx => ctx.title || `Worksheet${ctx.topic ? ` — ${ctx.topic}` : ''}` },
  'student-roster':      { icon: '👥', title: ctx => `${ctx.classLabel || `Class ${ctx.grade || 8}`} · Students` },
  'at-risk-students':    { icon: '⚠️', title: () => 'At-Risk Students' },
  'class-report':        { icon: '📊', title: ctx => `${ctx.classLabel || `Class ${ctx.grade || 8}`} · Class Report` },
  pdf:         { icon: '📄', title: () => 'Generate PDF' },
  report:      { icon: '📋', title: ctx => ctx.scope === 'district' ? 'District Report' : 'Class Report' },
  digivritti:  { icon: '🌸', title: ctx => {
    const scheme = ctx.scheme && ctx.scheme !== 'all' ? ` — ${SCHEME_TITLE[ctx.scheme] || ctx.scheme}` : ''
    if (ctx.view === 'apply')          return `DigiVritti${scheme} · New Application`
    if (ctx.view === 'edit')           return `DigiVritti${scheme} · ${ctx.readOnly ? 'View' : 'Edit'} Application`
    if (ctx.view === 'student-select') return `DigiVritti${scheme} · Select Student`
    if (ctx.view === 'opt-out')        return `DigiVritti · Opt-out`
    if (ctx.view === 'review')         return `DigiVritti · Approver Review`
    if (ctx.view === 'payment-queue')  return `DigiVritti · Payment Queue`
    if (ctx.view === 'analytics')      return `DigiVritti · State Analytics`
    return `DigiVritti${scheme} · Applications`
  } },
}

const LEGACY_TABS = [
  { id: 'editor', emoji: '📝', label: 'Notes'    },
  { id: 'form',   emoji: '📋', label: 'Forms'    },
  { id: 'log',    emoji: '📊', label: 'Activity' },
  { id: 'export', emoji: '📤', label: 'Export'   },
]

export default function CanvasPanel() {
  const { canvasOpen, closeCanvas, canvasContext } = useApp()
  const [legacyTab, setLegacyTab] = React.useState('editor')

  if (!canvasOpen) return null

  const ctx = canvasContext || {}
  const isNotifications = ctx.type === 'notifications'
  const isModule = !!MODULE_META[ctx.type]
  const meta = isModule ? MODULE_META[ctx.type] : null

  // Notifications canvas owns its own header — keep this panel a thin shell.
  if (isNotifications) {
    return (
      <>
        <div className="absolute inset-0 bg-black/25 z-40" onClick={closeCanvas} />
        <div className="absolute inset-y-0 right-0 z-50 flex flex-col bg-white animate-canvas-slide overflow-hidden border-l border-bdr-light shadow-canvas
                        w-full md:w-[60%] lg:w-[480px] xl:w-[520px] max-w-full">
          <NotificationCanvas
            initialView={ctx.view || 'list'}
            initialBroadcastPrefill={ctx.broadcastPrefill || null}
            initialReminderPrefill={ctx.reminderPrefill || null}
            onClose={closeCanvas}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {/* Backdrop — clicking outside the panel closes the canvas. On desktop
          this only dims the area to the LEFT of the right-side panel, so the
          chat stays partially visible behind the dim layer. */}
      <div
        className="absolute inset-0 bg-black/25 z-40"
        onClick={closeCanvas}
      />

      {/* Panel — full-width on mobile, right-side artifact panel on tablet+
          (so the SwiftChat chat thread stays visible on the left). */}
      <div className="absolute inset-y-0 right-0 z-50 flex flex-col bg-white animate-canvas-slide overflow-hidden border-l border-bdr-light shadow-canvas
                      w-full md:w-[60%] lg:w-[640px] xl:w-[720px] max-w-full">

        {/* Header */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-bdr-light flex-shrink-0 bg-white">
          <button
            onClick={closeCanvas}
            className="w-10 h-10 flex items-center justify-center rounded-full text-txt-secondary active:bg-surface-secondary transition-colors flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          {isModule ? (
            <>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-primary-light">
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-txt-primary truncate">
                  {meta.title(ctx)}
                </div>
                <div className="text-[11px] text-txt-secondary">
                  {ctx.role ? `${ctx.role.charAt(0).toUpperCase() + ctx.role.slice(1)} · SwiftChat` : 'SwiftChat Workspace'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-base flex-shrink-0">⊞</div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-txt-primary truncate">
                  {ctx.botName ? `${ctx.botName} Canvas` : 'Canvas Workspace'}
                </div>
                <div className="text-[11px] text-txt-secondary">SwiftChat · Execution Layer</div>
              </div>
            </>
          )}

          <button className="w-10 h-10 flex items-center justify-center rounded-full text-txt-secondary active:bg-surface-secondary transition-colors flex-shrink-0">
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Legacy tab bar (only for non-module canvas) */}
        {!isModule && (
          <div className="flex border-b border-bdr-light flex-shrink-0 bg-white">
            {LEGACY_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setLegacyTab(t.id)}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                  legacyTab === t.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-txt-secondary'
                }`}
              >
                <span className="text-[15px] leading-none">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {isModule ? (
            <>
              {ctx.type === 'attendance'  && <AttendanceCanvas  context={ctx} />}
              {ctx.type === 'dashboard'   && <DashboardCanvas   context={ctx} />}
              {ctx.type === 'data-entry'  && <DataEntryCanvas   context={ctx} />}
              {ctx.type === 'intervention'&& <InterventionCanvas context={ctx} />}
              {ctx.type === 'lesson-plan'        && <LessonPlanCanvas        context={ctx} />}
              {ctx.type === 'worksheet-template' && <WorksheetTemplateCanvas context={ctx} />}
              {ctx.type === 'worksheet-editor'   && <WorksheetEditorCanvas   context={ctx} />}
              {ctx.type === 'student-roster'     && <StudentRosterCanvas     context={ctx} />}
              {ctx.type === 'at-risk-students'   && <AtRiskStudentsCanvas    context={ctx} />}
              {ctx.type === 'class-report'       && <ClassReportCanvas       context={ctx} />}
              {ctx.type === 'pdf'         && <PDFCanvas         context={ctx} />}
              {ctx.type === 'report'      && <ReportCanvas      context={ctx} />}
              {ctx.type === 'digivritti'  && <DigiVrittiCanvas  context={ctx} />}
            </>
          ) : (
            <>
              {legacyTab === 'editor' && <RichTextEditor context={ctx} />}
              {legacyTab === 'form'   && <DataForm       context={ctx} />}
              {legacyTab === 'log'    && <ActivityLog    context={ctx} />}
              {legacyTab === 'export' && <ExportOptions  context={ctx} />}
            </>
          )}
        </div>
      </div>
    </>
  )
}
