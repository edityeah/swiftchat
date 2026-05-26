import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Plus, Search, Send, Upload, ChevronRight, ChevronUp, ArrowLeft, Camera, FileUp, Eye,
  Download, X, Menu, Sparkles,
  CalendarCheck, BarChart3, ScanLine, Award, AlertTriangle,
  MessageSquare, FileText, UserRound, BookOpen, GraduationCap,
  TrendingUp, Building2, Map, Brain, Clock,
  Newspaper, LogOut,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  STUDENTS, PERF_DATA, AT_RISK_STUDENTS, SCHOLARSHIP_DATA,
  DISTRICTS, STATE_SUMMARY, LEARNING_OUTCOMES, NAMO_LAXMI_APPS,
  SCHOOL_INFO, XAMTA_SAMPLE_RESULTS, getAttendanceHistory,
  ATTENDANCE_30D, SUBJECT_MASTERY_12W, SCHOOL_GRADE_BREAKDOWN,
  TOP_PERFORMERS, SCHOLARSHIP_FUNNEL, MONTHLY_DISBURSEMENT,
  PAYMENT_FAILURES, attendance14d, USER_PROFILES,
} from '../data/mockData'
import {
  kpiGrid, lineChart, barChart, hBarList, donut, funnel,
  sparkline, heatmap, gauge, sectionHeader, pillTone, miniStatRow,
  tokens as CHART, fmt as fmtNum, ui as chartUi,
} from '../utils/dashboardCharts'
import { ROLE_BOTS, ROLE_SUGGESTIONS } from '../roles/roleConfig'
import { AGGREGATES as REGISTRY_AGG, aggregatesFor, teachersForScope, schoolsForScope } from '../data/registries'
import { getAtRiskCohort, getSchoolCohort } from '../data/atRiskData'
import { dispatchDigiVritti, isDigiVrittiTrigger } from '../utils/digivrittiChat'
import { groupByRecency, detectTool, TOOL_TITLES } from '../utils/chatHistory'
import { routeIntentSync, routeIntent } from '../nlp/globalIntentRouter'
import { isRemoteEnabled } from '../nlp/groqInterpreter'
import { aiAnswerCardHtml } from '../nlp/aiAnswerCard'
import NotificationBell from '../components/notifications/NotificationBell'
import { useVoiceCall } from '../voice/VoiceCallProvider'
import { Phone as PhoneIcon, Mic, MicOff, Monitor, MonitorOff } from 'lucide-react'
import {
  buildAskAiGreeting, buildAskAiNextChips, runAskAiPrompt,
  processAskAiQuery, buildAskAiFallback,
  isAskAiOpenTrigger, isAskAiMorePromptsTrigger, isAskAiFewerPromptsTrigger,
  isAskAiRunTrigger, decodeAskAiRunTrigger,
  ASK_AI_LABELS,
} from '../features/askAi/askAiEngine'
import {
  isAskAiActionTrigger, decodeAskAiActionTrigger, runAskAiAction,
} from '../features/askAi/askAiActions'
import { answerQuery as answerAskAiChart } from '../features/askAi2/queryEngine'
import ReportCardSection from '../components/kpi/ReportCardSection'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SCHOOL = SCHOOL_INFO?.name || 'Sardar Patel Prathmik Shala'
const TODAY = new Date().toLocaleDateString('en-GB',{ day:'2-digit',month:'2-digit',year:'numeric' }).replace(/\//g,'/')

// Role metadata — reads from USER_PROFILES when available
const ROLE_META = {
  teacher:         { name:'Ms. Priya Mehta',  org:'GPS Mehsana',        badge:'Teacher'         },
  principal:       { name:'Mr. Rakesh Joshi', org:'GPS Mehsana',        badge:'Principal'       },
  deo:             { name:'Mr. Amit Trivedi', org:'Ahmedabad District', badge:'DEO'             },
  state_secretary: { name:'Ms. Nidhi Shah',   org:'Gujarat Dept. Edu.', badge:'State Secretary' },
  parent:          { name:'Meena Patel',       org:'Parent Portal',      badge:'Parent'          },
  crc:             { name:'Mr. Mehul Parmar', org:'Cluster MADHAPAR · Kachchh', badge:'CRC · Cluster Approver' },
  pfms:            { name:'Ms. Farida Shaikh', org:'PFMS — Gujarat',     badge:'PFMS · Payment Officer' },
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM TOKENS — used across all artifact / inline HTML
// ─────────────────────────────────────────────────────────────────────────────
const DS = {
  // Colors — semantic
  brand: '#386AF6', brandHover: '#1339A3', brandSubtle: '#EEF2FF', brandSubtleStrong: '#C3D2FC', brandTextSubdued: '#345CCC',
  textPrimary: '#0E0E0E', textSecondary: '#7383A5', textTertiary: '#828996', textInverse: '#FFFFFF',
  borderDefault: '#D5D8DF', borderSubtle: '#ECECEC', borderStrong: '#999999',
  surfaceDefault: '#FFFFFF', surface: '#ECECEC', surfaceRaised: '#FFFFFF',
  success: '#00BA34', successSubtle: '#CCEFBF', successText: '#007B22', successBannerBg: '#D4F5DC',
  warning: '#F8B200', warningSubtle: '#FDE1AC', warningText: '#9A6500', warningBannerBg: '#FFF3CC',
  error:   '#EB5757', errorSubtle: '#FDEAEA',   errorText:   '#C0392B',
  info:    '#84A2F4', infoSubtle: '#C3D2FC',     infoText:    '#345CCC', infoBannerBg: '#E0E7FF',
  // Typography
  font: 'Montserrat, sans-serif',
  // Radii
  radiusXs: 2, radiusSm: 4, radiusMd: 8, radiusLg: 12, radiusXl: 16, radius2xl: 20, radiusFull: 999,
}

// ─────────────────────────────────────────────────────────────────────────────
// Call-agent button — sits in the home top bar next to the notification bell.
// Starts the voice + screen-share session. Pulses while connected.
// ─────────────────────────────────────────────────────────────────────────────
function CallAgentButton() {
  const v = useVoiceCall?.()
  if (!v) return null
  const { status, startCall, endCall } = v
  const isLive = status === 'connecting' || status === 'connected'
  const onClick = () => {
    if (isLive) endCall()
    else startCall()
  }
  return (
    <button
      onClick={onClick}
      title={isLive ? 'End voice call' : 'Call Saathi (voice agent)'}
      style={{
        width: 36, height: 36, borderRadius: 999, marginRight: 6,
        background: isLive ? '#B91C1C' : '#386AF6',
        color: '#FFFFFF', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: isLive ? '0 0 0 0 rgba(185, 28, 28, 0.5)' : 'none',
        animation: isLive ? 'pulse-ring 1.6s ease-out infinite' : 'none',
      }}
    >
      <PhoneIcon size={16} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline voice-call controls — render to the LEFT of the call button while a
// call is active. Mic toggle, screen-share toggle, and a small status pill.
// No popup, no floating panel — just buttons sitting in the topbar.
// ─────────────────────────────────────────────────────────────────────────────
function InlineCallControls() {
  const v = useVoiceCall?.()
  if (!v) return null
  const {
    status, muted, agentSpeaking, screenSharing,
    toggleMute, startScreenShare, stopScreenShare,
  } = v
  if (status === 'idle') return null

  const statusText = (() => {
    if (status === 'connecting') return 'Connecting…'
    if (status === 'ending')     return 'Ending…'
    if (status === 'error')      return 'Error'
    if (agentSpeaking)           return 'Speaking…'
    if (muted)                   return 'Muted'
    return 'Listening'
  })()

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '2px 6px 2px 10px',
      marginRight: 6,
      borderRadius: 999,
      background: '#F4F6FA',
      border: '1px solid #D5D8DF',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      {/* Pulsing dot + status label */}
      <span style={{
        width: 7, height: 7, borderRadius: 999,
        background: agentSpeaking ? '#10B981' : status === 'error' ? '#B91C1C' : '#386AF6',
        animation: status === 'connected' ? 'pulse-ring 1.6s ease-out infinite' : 'none',
        flexShrink: 0,
      }} />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0E0E0E', marginRight: 2 }}>
        {statusText}
      </span>

      {/* Mic toggle */}
      <button
        onClick={toggleMute}
        title={muted ? 'Unmute' : 'Mute'}
        disabled={status !== 'connected'}
        style={{
          width: 28, height: 28, borderRadius: 999,
          border: '1px solid ' + (muted ? '#FECACA' : '#D5D8DF'),
          background: muted ? '#FEE2E2' : '#FFFFFF',
          color:      muted ? '#B91C1C' : '#0E0E0E',
          cursor: status === 'connected' ? 'pointer' : 'default',
          opacity: status === 'connected' ? 1 : 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {muted ? <MicOff size={13} /> : <Mic size={13} />}
      </button>

      {/* Screen-share toggle */}
      <button
        onClick={screenSharing ? stopScreenShare : startScreenShare}
        title={screenSharing ? 'Stop sharing' : 'Share screen'}
        disabled={status !== 'connected'}
        style={{
          width: 28, height: 28, borderRadius: 999,
          border: '1px solid ' + (screenSharing ? '#FDE68A' : '#D5D8DF'),
          background: screenSharing ? '#FEF3C7' : '#FFFFFF',
          color:      screenSharing ? '#92400E' : '#0E0E0E',
          cursor: status === 'connected' ? 'pointer' : 'default',
          opacity: status === 'connected' ? 1 : 0.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {screenSharing ? <MonitorOff size={13} /> : <Monitor size={13} />}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTIFACT BUILDERS  (return { title, icon, html })
// ─────────────────────────────────────────────────────────────────────────────
function pill(val, hi=85, mid=70) {
  const c = val>=hi ? `${DS.successSubtle}:${DS.successText}` : val>=mid ? `${DS.warningSubtle}:${DS.warningText}` : `${DS.errorSubtle}:${DS.errorText}`
  const [bg, fg] = c.split(':')
  return `<span style="background:${bg};color:${fg};padding:2px 10px;border-radius:${DS.radiusFull}px;font-size:11px;font-weight:500;letter-spacing:0.2px;font-family:${DS.font}">${val}%</span>`
}
function levelPill(lvl) {
  const map = { Advanced:`${DS.infoSubtle}:${DS.infoText}`, Proficient:`${DS.infoSubtle}:${DS.infoText}`, Basic:`${DS.warningSubtle}:${DS.warningText}`, 'Below Basic':`${DS.errorSubtle}:${DS.errorText}` }
  const [bg,fg] = (map[lvl]||`${DS.borderSubtle}:${DS.textPrimary}`).split(':')
  return `<span style="background:${bg};color:${fg};padding:2px 10px;border-radius:${DS.radiusFull}px;font-size:11px;font-weight:500;letter-spacing:0.2px;font-family:${DS.font}">${lvl}</span>`
}

function buildAttendanceArtifact(ctx) {
  const grade = ctx.grade || '8'
  const students = STUDENTS[grade] || STUDENTS[8]
  const absent = students.filter((_,i) => ctx.absentIdx?.includes(i))
  const present = students.length - absent.length
  const rows = students.map((s,i) => {
    const isAbsent = ctx.absentIdx?.includes(i)
    return `<div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid ${DS.borderSubtle};gap:8px">
      <div style="flex:1;font-family:${DS.font}">
        <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${DS.textPrimary}">${s.name}</span>
        <span style="color:${DS.textTertiary};font-size:12px;font-weight:400;letter-spacing:0.4px;margin-left:8px">${s.id}</span>
      </div>
      <span style="background:${isAbsent?DS.errorSubtle:DS.successSubtle};color:${isAbsent?DS.errorText:DS.successText};padding:4px 12px;border-radius:${DS.radiusFull}px;font-size:11px;font-weight:500;letter-spacing:0.2px;font-family:${DS.font}">${isAbsent?'Absent':'Present'}</span>
    </div>`
  }).join('')
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      <h2 style="font-size:24px;font-weight:600;line-height:32px;margin:0 0 4px">Attendance Register</h2>
      <p style="color:${DS.textSecondary};font-size:12px;font-weight:400;letter-spacing:0.4px;margin:0 0 24px">${SCHOOL} · Grade ${grade} · ${TODAY}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
        <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;background:${DS.surfaceRaised}">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary};margin-bottom:8px">Present</div>
          <div style="font-size:24px;font-weight:600;line-height:32px;color:${DS.success}">${present}</div>
        </div>
        <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;background:${DS.surfaceRaised}">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary};margin-bottom:8px">Absent</div>
          <div style="font-size:24px;font-weight:600;line-height:32px;color:${DS.error}">${students.length-present}</div>
        </div>
      </div>
      <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;background:${DS.surfaceRaised}">${rows}</div>
    </div>`
  return { title:'Attendance', icon:'📅', html }
}

function buildLessonPlanArtifact(ctx) {
  const { subject='Mathematics', grade='8', topic='Photosynthesis' } = ctx
  const sections = [
    { color:DS.warning, title:'Learning Objectives', items:[
      `Understand the core concept of ${topic}`,
      'Identify and explain key elements with examples',
      'Apply the concept to solve practice problems',
      'Demonstrate understanding through group activity',
    ]},
    { color:DS.brand, title:'Teaching Materials', items:[
      'Whiteboard and colored markers',
      'Chart paper with diagrams',
      'Practice worksheet (printed)',
      'G-SHALA digital content module',
    ]},
    { color:DS.success, title:'Lesson Flow', items:[
      `<strong>Introduction (7 min):</strong> Begin with a real-world question about ${topic}. Engage students with a hands-on warm-up activity.`,
      `<strong>Concept Explanation (12 min):</strong> Use visual aids and step-by-step board work. Reference chart paper for key points.`,
      `<strong>Guided Practice (12 min):</strong> Solve 3-4 problems as a class. Students practice similar problems individually.`,
      `<strong>Group Activity (9 min):</strong> Students work in groups to apply concepts and present findings.`,
      `<strong>Assessment (5 min):</strong> Exit ticket — 2 questions checking understanding.`,
    ]},
  ]
  const sectHtml = sections.map(s => `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <div style="width:4px;height:20px;background:${s.color};border-radius:${DS.radiusFull}px;flex-shrink:0"></div>
        <h4 style="font-size:16px;font-weight:600;letter-spacing:0.1px;margin:0;color:${DS.textPrimary}">${s.title}</h4>
      </div>
      <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px">
        ${s.items.map(i=>`<li style="font-size:14px;font-weight:400;line-height:20px;letter-spacing:0.25px;color:${DS.textPrimary}">${i}</li>`).join('')}
      </ul>
    </div>`).join('')
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <span style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textTertiary};text-transform:uppercase">LESSON PLAN</span>
        <span style="background:${DS.brandSubtle};color:${DS.brand};font-size:11px;font-weight:500;letter-spacing:0.2px;padding:4px 10px;border-radius:${DS.radiusFull}px">VSK Gujarat</span>
      </div>
      <h1 style="font-size:24px;font-weight:600;line-height:32px;margin:8px 0 4px">${topic}</h1>
      <p style="color:${DS.textSecondary};font-size:12px;font-weight:400;letter-spacing:0.4px;margin:0 0 16px">Grade ${grade} · ${subject} · ${TODAY} · 45 min</p>
      <div style="height:2px;background:${DS.brand};border-radius:${DS.radiusFull}px;margin-bottom:24px"></div>
      ${sectHtml}
    </div>`
  return { title:'Lesson Plan', icon:'📋', html }
}

function buildPerformanceArtifact(ctx) {
  const grade = ctx.grade === 'All' ? '5' : (ctx.grade || '5')
  const d = PERF_DATA[grade] || PERF_DATA[5]
  // Distribution buckets: <60 / 60-74 / 75-84 / 85+
  const dist = { basic: 0, proficient: 0, advanced: 0, struggling: 0 }
  d.students.forEach(s => {
    const avg = (s.m + s.s + s.g) / 3
    if (avg >= 85) dist.advanced++
    else if (avg >= 75) dist.proficient++
    else if (avg >= 60) dist.basic++
    else dist.struggling++
  })
  const total = d.students.length
  const presentToday = Math.round(total * (ATTENDANCE_30D.school.at(-1) / 100))

  const tableRows = d.students.map((s, i) => {
    const avg = Math.round((s.m + s.s + s.g) / 3)
    const trend = sparkline({
      values: [avg - 8, avg - 5, avg - 6, avg - 3, avg - 1, avg, avg + 1].map(v => Math.max(40, Math.min(100, v))),
      color: avg >= 75 ? CHART.success : avg >= 60 ? CHART.brand : CHART.warning,
      width: 60, height: 20,
    })
    return `<tr style="border-top:1px solid ${DS.borderSubtle}">
      <td style="padding:10px 8px;font-size:13px;font-weight:600;color:${DS.textPrimary};font-family:${DS.font}">
        <span style="display:inline-flex;align-items:center;gap:8px">
          <span style="width:24px;height:24px;border-radius:999px;background:${CHART.brandSubtle};color:${CHART.brand};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">${(i+1).toString().padStart(2,'0')}</span>
          ${s.name}
        </span>
      </td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;color:${DS.textPrimary};font-family:${DS.font}">${s.m}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;color:${DS.textPrimary};font-family:${DS.font}">${s.s}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;color:${DS.textPrimary};font-family:${DS.font}">${s.g}</td>
      <td style="padding:10px 8px;font-size:13px;text-align:center;font-weight:600;color:${DS.textPrimary};font-family:${DS.font}">${avg}%</td>
      <td style="padding:10px 8px;text-align:center">${trend}</td>
      <td style="padding:10px 8px;text-align:center">${levelPill(s.lvl)}</td>
    </tr>`
  }).join('')

  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: `Class Performance — Grade ${grade}`,
        subtitle: `${SCHOOL} · ${TODAY}`,
        badge: `${total} students`,
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'Class Avg',        value: Math.round((d.math + d.sci + d.guj) / 3) + '%', tone: 'brand',   icon: '📊' },
        { label: 'Today Attendance', value: presentToday + '/' + total,                      tone: 'success', icon: '📅', sub: ATTENDANCE_30D.school.at(-1) + '%' },
        { label: 'Top scorer',       value: Math.max(...d.students.map(s => Math.round((s.m+s.s+s.g)/3))) + '%', tone: 'purple', icon: '🥇' },
        { label: 'Need help',        value: dist.struggling + dist.basic + ' students',     tone: 'warning', icon: '🎯', sub: 'below 75%' },
      ])}

      ${barChart({
        title: 'Subject averages',
        sub: 'Class-wide · current term',
        items: [
          { label: 'Math',     value: d.math, color: CHART.brand },
          { label: 'Science',  value: d.sci,  color: CHART.purple },
          { label: 'Gujarati', value: d.guj,  color: CHART.success },
        ],
        height: 160,
      })}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${donut({
          title: 'Mastery distribution',
          centerValue: total,
          centerLabel: 'students',
          segments: [
            { label: 'Advanced (85+)',    value: dist.advanced,   color: CHART.success },
            { label: 'Proficient (75-84)', value: dist.proficient, color: CHART.brand },
            { label: 'Basic (60-74)',      value: dist.basic,      color: CHART.warning },
            { label: 'Struggling (<60)',   value: dist.struggling, color: CHART.error },
          ],
        })}
        ${lineChart({
          title: 'Class avg — last 12 weeks',
          labels: SUBJECT_MASTERY_12W.labels,
          series: [
            { name: 'Math',     color: CHART.brand,   values: SUBJECT_MASTERY_12W.Math },
            { name: 'Science',  color: CHART.purple,  values: SUBJECT_MASTERY_12W.Science },
            { name: 'Gujarati', color: CHART.success, values: SUBJECT_MASTERY_12W.Gujarati },
          ],
          height: 160,
        })}
      </div>

      ${chartUi.panelStart()}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <h4 style="font-size:14px;font-weight:600;margin:0;color:${DS.textPrimary}">Student details</h4>
          <span style="font-size:11px;color:${CHART.textTertiary}">Tap a row to drill into a student</span>
        </div>
        <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
          <table style="width:100%;border-collapse:collapse;min-width:560px">
            <thead>
              <tr style="background:${CHART.surfaceTint}">
                <th style="text-align:left;padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase">Student</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Math</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Sci</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Guj</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Avg</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Trend</th>
                <th style="padding:10px 8px;font-size:10px;font-weight:600;color:${CHART.textTertiary};letter-spacing:0.3px;text-transform:uppercase;text-align:center">Level</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      ${chartUi.panelEnd()}
    </div>`
  return { title: 'Performance', icon: '📊', html }
}

function buildReportCardArtifact(ctx) {
  const { grade='8', student='Ravi Parmar' } = ctx
  const d = PERF_DATA[grade] || PERF_DATA[8]
  const s = d.students[0]
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      <div style="background:linear-gradient(135deg,${DS.brand},${DS.brandHover});color:${DS.textInverse};padding:24px;border-radius:${DS.radiusLg}px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;opacity:0.85;text-transform:uppercase">Report Card · VSK Gujarat</div>
        <div style="font-size:24px;font-weight:600;line-height:32px;margin-top:4px">${student}</div>
        <div style="font-size:14px;font-weight:400;letter-spacing:0.25px;opacity:0.85">Grade ${grade} · ${SCHOOL}</div>
        <div style="font-size:12px;font-weight:400;letter-spacing:0.4px;opacity:0.75;margin-top:4px">Academic Year 2025–26</div>
      </div>
      <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;margin-bottom:12px;background:${DS.surfaceRaised}">
        <h4 style="font-size:14px;font-weight:600;letter-spacing:-0.2px;margin:0 0 12px;color:${DS.textPrimary}">Subject Performance</h4>
        ${['Mathematics','Science','Gujarati','Social Science','English'].map((sub,i)=>{
          const score = [s?.m||78,s?.s||74,s?.g||70,72,68][i]
          const grade_ = score>=85?'A+':score>=75?'A':score>=60?'B+':score>=50?'B':'C'
          return `<div style="display:flex;align-items:center;padding:12px 0;border-bottom:1px solid ${DS.borderSubtle}">
            <span style="flex:1;font-size:14px;font-weight:400;letter-spacing:0.25px;color:${DS.textPrimary}">${sub}</span>
            <span style="font-size:14px;font-weight:600;width:40px;text-align:right;letter-spacing:-0.2px;color:${DS.textPrimary}">${score}</span>
            <span style="margin-left:12px;width:32px;text-align:center;font-weight:700;font-size:16px;color:${DS.brand}">${grade_}</span>
          </div>`
        }).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;text-align:center;background:${DS.surfaceRaised}">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary}">Overall %</div>
          <div style="font-size:24px;font-weight:600;line-height:32px;color:${DS.brand};margin-top:4px">${Math.round(((s?.m||78)+(s?.s||74)+(s?.g||70)+72+68)/5)}%</div>
        </div>
        <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;text-align:center;background:${DS.surfaceRaised}">
          <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary}">Grade</div>
          <div style="font-size:24px;font-weight:600;line-height:32px;color:${DS.success};margin-top:4px">A</div>
        </div>
      </div>
    </div>`
  return { title:'Report Card', icon:'📄', html }
}

function buildScholarshipArtifact() {
  const schemes = SCHOLARSHIP_DATA || []
  const totalEligible = schemes.reduce((s, x) => s + x.eligible, 0)
  const totalApplied  = schemes.reduce((s, x) => s + x.applied, 0)
  const totalApproved = schemes.reduce((s, x) => s + x.approved, 0)
  const totalPending  = schemes.reduce((s, x) => s + (x.pending || 0), 0)
  const totalRejected = schemes.reduce((s, x) => s + (x.rejected || 0), 0)

  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'Scholarship Status',
        subtitle: `${SCHOOL} · ${TODAY}`,
        badge: schemes.length + ' schemes',
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'Eligible',    value: totalEligible,                                                      tone: 'brand',   icon: '👥' },
        { label: 'Applied',     value: totalApplied,                                                       tone: 'purple',  icon: '📝', sub: Math.round(totalApplied/totalEligible*100) + '% conversion' },
        { label: 'Approved',    value: totalApproved,                                                      tone: 'success', icon: '✅', sub: Math.round(totalApproved/totalApplied*100) + '% approval' },
        { label: 'Pending / Rejected', value: totalPending + ' / ' + totalRejected,                       tone: 'warning', icon: '⏳' },
      ])}

      ${funnel({
        title: 'Overall funnel',
        sub: 'Eligible → Applied → Approved · all schemes',
        stages: [
          { label: 'Eligible', value: totalEligible, color: CHART.brand },
          { label: 'Applied',  value: totalApplied,  color: CHART.purple },
          { label: 'Approved', value: totalApproved, color: CHART.success },
        ],
        suffix: ' students',
      })}

      ${schemes.map(s => {
        const pct = Math.round(s.approved / s.eligible * 100)
        return `<div style="border:1px solid ${DS.borderDefault};border-radius:14px;padding:16px;margin-bottom:12px;background:${DS.surfaceRaised};box-shadow:0 1px 2px rgba(14,14,14,0.04)">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:38px;height:38px;border-radius:10px;background:${s.color || CHART.brand}22;display:flex;align-items:center;justify-content:center;font-size:18px">🏅</div>
              <div>
                <h4 style="font-size:15px;font-weight:700;margin:0;color:${DS.textPrimary}">${s.name}</h4>
                <div style="font-size:11px;color:${DS.textTertiary};margin-top:2px">Approval rate: ${pct}%</div>
              </div>
            </div>
            ${pillTone(pct)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;text-align:center">
            ${[
              ['Eligible', s.eligible, DS.textPrimary, CHART.surfaceTint],
              ['Applied',  s.applied,  CHART.brand,    CHART.brandSubtle],
              ['Approved', s.approved, CHART.successText, CHART.successSubtle],
              ['Pending',  s.pending || 0, CHART.warningText, CHART.warningSubtle],
              ['Rejected', s.rejected || 0, CHART.errorText, CHART.errorSubtle],
            ].map(([l, v, c, bg]) => `
              <div style="background:${bg};border-radius:10px;padding:10px 6px">
                <div style="font-size:9px;font-weight:600;letter-spacing:0.3px;color:${DS.textSecondary};text-transform:uppercase">${l}</div>
                <div style="font-size:18px;font-weight:700;line-height:24px;color:${c};margin-top:2px">${v}</div>
              </div>`).join('')}
          </div>
          <div style="margin-top:12px;height:8px;background:${CHART.borderSubtle};border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, ${s.color || CHART.brand}, ${s.color || CHART.brand}cc);border-radius:4px"></div>
          </div>
        </div>`
      }).join('')}

      ${barChart({
        title: 'Monthly disbursement (district-level)',
        sub: '₹ Cr · last 6 months',
        items: MONTHLY_DISBURSEMENT.labels.map((m, i) => ({
          label: m,
          value: MONTHLY_DISBURSEMENT.district.disbursed[i],
          sub: '₹' + MONTHLY_DISBURSEMENT.district.disbursed[i] + ' Cr',
          color: i === MONTHLY_DISBURSEMENT.labels.length - 1 ? CHART.success : CHART.brandSubtleStrong,
        })),
        suffix: '',
      })}
    </div>`
  return { title: 'Scholarships', icon: '🏅', html }
}

function buildAtRiskArtifact() {
  const students = AT_RISK_STUDENTS || []
  const high   = students.filter(s => s.risk === 'high')
  const medium = students.filter(s => s.risk === 'medium')
  const byGrade = students.reduce((acc, s) => { acc[s.grade] = (acc[s.grade] || 0) + 1; return acc }, {})
  const reasonCounts = students.reduce((acc, s) => { acc[s.reason] = (acc[s.reason] || 0) + 1; return acc }, {})
  const reasonItems = Object.entries(reasonCounts).map(([k, v]) => ({ label: k, value: v, color: CHART.error }))

  const rows = students.map((s, i) => {
    const trend = sparkline({
      values: attendance14d(i + 1, s.attendance),
      color: s.risk === 'high' ? CHART.error : CHART.warning,
      width: 100, height: 24,
    })
    return `<div style="display:flex;align-items:center;padding:12px;border:1px solid ${DS.borderSubtle};border-radius:12px;margin-bottom:8px;gap:12px;background:${DS.surfaceRaised}">
      <div style="width:40px;height:40px;border-radius:999px;background:${s.risk === 'high' ? CHART.errorSubtle : CHART.warningSubtle};color:${s.risk === 'high' ? CHART.errorText : CHART.warningText};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:${DS.textPrimary}">${s.name} <span style="font-size:11px;font-weight:500;color:${CHART.textTertiary}">· Class ${s.grade}</span></div>
        <div style="font-size:11px;color:${CHART.textSecondary};margin-top:2px">${s.reason}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span style="font-size:10px;color:${CHART.textTertiary}">14-day attendance</span>
          ${trend}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:18px;font-weight:700;color:${s.risk === 'high' ? CHART.errorText : CHART.warningText}">${s.attendance}%</div>
        <div style="font-size:10px;color:${CHART.textTertiary};margin-top:2px">${s.days} absences</div>
        <span style="background:${s.risk === 'high' ? CHART.errorSubtle : CHART.warningSubtle};color:${s.risk === 'high' ? CHART.errorText : CHART.warningText};font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;display:inline-block;margin-top:4px;letter-spacing:0.3px">${s.risk.toUpperCase()}</span>
      </div>
    </div>`
  }).join('')

  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'At-Risk Students',
        subtitle: `${SCHOOL} · early-warning system`,
        badge: students.length + ' flagged',
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'High risk',     value: high.length,    tone: 'error',   icon: '🔴', sub: 'needs urgent action' },
        { label: 'Medium risk',   value: medium.length,  tone: 'warning', icon: '🟡', sub: 'monitor closely' },
        { label: 'Avg attendance', value: Math.round(students.reduce((s, x) => s + x.attendance, 0) / students.length) + '%', tone: 'brand', icon: '📅' },
        { label: 'Avg score',     value: Math.round(students.reduce((s, x) => s + x.score, 0) / students.length) + '%', tone: 'purple', icon: '📊' },
      ])}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${donut({
          title: 'Risk distribution',
          centerValue: students.length,
          centerLabel: 'students',
          segments: [
            { label: 'High risk',   value: high.length,    color: CHART.error },
            { label: 'Medium risk', value: medium.length,  color: CHART.warning },
          ],
        })}
        ${barChart({
          title: 'By grade',
          items: Object.entries(byGrade).map(([g, n]) => ({
            label: 'Grade ' + g,
            value: n,
            color: CHART.brand,
          })),
          suffix: '',
          height: 160,
        })}
      </div>

      ${hBarList({
        title: 'Top reasons',
        sub: 'Why students are flagged',
        items: reasonItems,
        suffix: '',
        maxValue: Math.max(...reasonItems.map(i => i.value)),
      })}

      ${chartUi.panelStart()}
        <h4 style="font-size:14px;font-weight:600;margin:0 0 12px;color:${DS.textPrimary}">Student details</h4>
        ${rows}
      ${chartUi.panelEnd()}

      <button style="width:100%;margin-top:8px;padding:14px;background:linear-gradient(135deg, ${CHART.brand}, ${CHART.brandHover});color:#fff;border:none;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:${DS.font};box-shadow:0 4px 12px rgba(56,106,246,0.25)">
        📨 Send Parent Alerts to all ${high.length} high-risk
      </button>
    </div>`
  return { title: 'At-Risk Students', icon: '⚠️', html }
}

function buildNamoLaxmiArtifact() {
  const apps = NAMO_LAXMI_APPS || []
  const statusColor = s => ({ approved:DS.successText, pending:DS.warningText, rejected:DS.errorText })[s] || DS.textPrimary
  const statusBg = s => ({ approved:DS.successSubtle, pending:DS.warningSubtle, rejected:DS.errorSubtle })[s] || DS.borderSubtle
  const rows = apps.map(a => `
    <div style="display:flex;align-items:center;padding:12px;border:1px solid ${DS.borderSubtle};border-radius:${DS.radiusLg}px;margin-bottom:8px;gap:10px;background:${DS.surfaceRaised}">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${DS.textPrimary}">${a.name}</div>
        <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textTertiary};margin-top:2px">App ID: ${a.appId}</div>
        ${a.reason ? `<div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.errorText};margin-top:4px">${a.reason}</div>` : ''}
      </div>
      <span style="background:${statusBg(a.status)};color:${statusColor(a.status)};font-size:11px;font-weight:500;letter-spacing:0.2px;padding:2px 10px;border-radius:${DS.radiusFull}px;text-transform:capitalize">${a.status}</span>
    </div>`).join('')
  const approved = apps.filter(a=>a.status==='approved').length
  const pending = apps.filter(a=>a.status==='pending').length
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      <h2 style="font-size:24px;font-weight:600;line-height:32px;margin:0 0 4px">Namo Laxmi Yojana</h2>
      <p style="color:${DS.textSecondary};font-size:12px;font-weight:400;letter-spacing:0.4px;margin:0 0 24px">${SCHOOL} · ${TODAY}</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        ${[['Total',apps.length,DS.textPrimary],['Approved',approved,DS.success],['Pending',pending,DS.warning]].map(([l,v,c])=>`
          <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:16px;text-align:center;background:${DS.surfaceRaised}">
            <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary}">${l}</div>
            <div style="font-size:24px;font-weight:600;line-height:32px;color:${c};margin-top:4px">${v}</div>
          </div>`).join('')}
      </div>
      <div>${rows}</div>
    </div>`
  return { title:'Namo Laxmi', icon:'🌸', html }
}

function buildDashboardArtifact(ctx) {
  const scope = ctx.scope || 'school'
  if (scope === 'state')    return buildStateDashboard()
  if (scope === 'district') return buildDistrictDashboard()
  return buildSchoolDashboard()
}

function buildSchoolDashboard() {
  const totalStudents = SCHOOL_GRADE_BREAKDOWN.reduce((s, g) => s + g.total, 0)
  const todayAtt = ATTENDANCE_30D.school[ATTENDANCE_30D.school.length - 1]
  const yesterdayAtt = ATTENDANCE_30D.school[ATTENDANCE_30D.school.length - 2]
  const delta = (todayAtt - yesterdayAtt).toFixed(1)
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'School Dashboard',
        subtitle: `${SCHOOL} · ${TODAY}`,
        badge: 'Live',
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'Total Students', value: fmtNum(totalStudents), tone: 'brand',   icon: '👨‍🎓', sub: 'Class 3, 5, 6, 8' },
        { label: 'Today Attendance', value: todayAtt + '%', tone: 'success', icon: '📅', trend: { delta: (delta >= 0 ? '+' : '') + delta + '%', up: delta >= 0 } },
        { label: 'Avg Score',  value: '74.1%', tone: 'warning', icon: '📊', sub: 'XAMTA: last 30 days' },
        { label: 'Scheme Rate', value: '82.5%', tone: 'purple',  icon: '🏅', sub: 'Namo Laxmi + DBT' },
      ], { columns: 'auto-fit' })}

      ${lineChart({
        title: 'Attendance — last 30 days',
        sub: 'Daily school-wide attendance %',
        labels: ATTENDANCE_30D.labels,
        series: [{ name: 'Attendance', color: CHART.brand, values: ATTENDANCE_30D.school }],
        height: 180,
      })}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${donut({
          title: 'Grade enrolment',
          sub: 'Class-wise student count',
          centerValue: totalStudents,
          centerLabel: 'students',
          segments: SCHOOL_GRADE_BREAKDOWN.map(g => ({ label: g.grade, value: g.total })),
        })}
        ${barChart({
          title: 'Subject mastery — current week',
          items: [
            { label: 'Math',     value: SUBJECT_MASTERY_12W.Math.at(-1),     color: CHART.brand },
            { label: 'Science',  value: SUBJECT_MASTERY_12W.Science.at(-1),  color: CHART.purple },
            { label: 'Gujarati', value: SUBJECT_MASTERY_12W.Gujarati.at(-1), color: CHART.success },
            { label: 'English',  value: SUBJECT_MASTERY_12W.English.at(-1),  color: CHART.warning },
          ],
          height: 180,
        })}
      </div>

      ${lineChart({
        title: 'Subject mastery — last 12 weeks',
        sub: 'XAMTA-derived weekly average',
        labels: SUBJECT_MASTERY_12W.labels,
        series: [
          { name: 'Math',     color: CHART.brand,   values: SUBJECT_MASTERY_12W.Math },
          { name: 'Science',  color: CHART.purple,  values: SUBJECT_MASTERY_12W.Science },
          { name: 'Gujarati', color: CHART.success, values: SUBJECT_MASTERY_12W.Gujarati },
          { name: 'English',  color: CHART.warning, values: SUBJECT_MASTERY_12W.English },
        ],
        height: 200,
      })}

      ${chartUi.panelStart()}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <h4 style="font-size:14px;font-weight:600;margin:0;color:${DS.textPrimary}">Top performers</h4>
            <div style="font-size:11px;color:${DS.textTertiary};margin-top:2px">Across all classes · last term</div>
          </div>
          <span style="background:${CHART.brandSubtle};color:${CHART.brand};font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px">Top 5</span>
        </div>
        ${TOP_PERFORMERS.map((s, i) => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid ${DS.borderSubtle}">
            <div style="width:28px;height:28px;border-radius:999px;background:${i === 0 ? CHART.warning : i < 3 ? CHART.brandSubtle : CHART.borderSubtle};color:${i === 0 ? '#fff' : i < 3 ? CHART.brand : CHART.textSecondary};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i === 0 ? '🥇' : i < 3 ? '🏅' : i + 1}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:${DS.textPrimary}">${s.name}</div>
              <div style="font-size:11px;color:${DS.textTertiary}">Class ${s.grade} · attendance ${s.attendance}%</div>
            </div>
            ${pillTone(s.score)}
          </div>`).join('')}
      ${chartUi.panelEnd()}

      ${chartUi.panelStart()}
        <h4 style="font-size:14px;font-weight:600;margin:0 0 10px;color:${DS.textPrimary}">⚠️ Items that need attention</h4>
        ${miniStatRow([
          { icon: '🔴', label: 'High-risk students',  value: AT_RISK_STUDENTS.filter(s=>s.risk==='high').length + ' students',     bg: CHART.errorSubtle },
          { icon: '🟡', label: 'Medium-risk',          value: AT_RISK_STUDENTS.filter(s=>s.risk==='medium').length + ' students',  bg: CHART.warningSubtle },
          { icon: '📋', label: 'Pending Namo Laxmi',  value: NAMO_LAXMI_APPS.filter(a=>a.status==='pending').length + ' apps',      bg: CHART.brandSubtle },
          { icon: '👨‍🏫', label: 'Teachers reporting', value: '14 / 16',                                                              bg: CHART.purpleSubtle },
        ])}
      ${chartUi.panelEnd()}
    </div>`
  return { title: 'School Dashboard', icon: '📊', html }
}

function buildDistrictDashboard() {
  const totalSchools  = DISTRICTS.reduce((s, d) => s + d.schools, 0)
  const totalStudents = DISTRICTS.reduce((s, d) => s + d.students, 0)
  const totalRisk     = DISTRICTS.reduce((s, d) => s + d.riskStudents, 0)
  const avgAtt        = (DISTRICTS.reduce((s, d) => s + d.attendance, 0) / DISTRICTS.length).toFixed(1)

  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'District Dashboard — Ahmedabad',
        subtitle: `District Education Office · ${TODAY}`,
        badge: 'DEO',
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'Schools',           value: fmtNum(totalSchools),  tone: 'brand',   icon: '🏫', sub: '8 blocks · 412 villages' },
        { label: 'Students',          value: fmtNum(totalStudents), tone: 'purple',  icon: '👥', sub: 'across all grades' },
        { label: 'Avg Attendance',    value: avgAtt + '%',          tone: 'success', icon: '📅', trend: { delta: '+2.3%', up: true } },
        { label: 'High-risk students', value: fmtNum(totalRisk),     tone: 'error',   icon: '⚠️', sub: 'flagged this month' },
      ])}

      ${lineChart({
        title: 'District attendance — last 30 days',
        sub: 'Aggregated across 8 blocks',
        labels: ATTENDANCE_30D.labels,
        series: [{ name: 'District', color: CHART.brand, values: ATTENDANCE_30D.district }],
        height: 180,
      })}

      ${hBarList({
        title: 'Top 8 blocks — attendance ranking',
        sub: 'Tap a row to drill into block detail',
        items: [...DISTRICTS]
          .sort((a, b) => b.attendance - a.attendance)
          .map(d => ({
            label: d.name,
            value: d.attendance,
            color: d.attendance >= 88 ? CHART.success : d.attendance >= 83 ? CHART.brand : CHART.warning,
            sub: `${d.schools} schools`,
          })),
      })}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${funnel({
          title: 'Scholarship funnel',
          sub: 'Initiated → Paid · this AY',
          stages: SCHOLARSHIP_FUNNEL.district,
        })}
        ${barChart({
          title: 'Monthly disbursement',
          sub: '₹ Cr · sanctioned vs disbursed',
          items: MONTHLY_DISBURSEMENT.labels.map((m, i) => ({
            label: m,
            value: MONTHLY_DISBURSEMENT.district.disbursed[i],
            sub: '₹' + MONTHLY_DISBURSEMENT.district.disbursed[i] + ' Cr',
            color: CHART.success,
          })),
          suffix: '',
          yMax: Math.max(...MONTHLY_DISBURSEMENT.district.sanctioned) * 1.1,
        })}
      </div>

      ${heatmap({
        title: 'Block × indicator heatmap',
        sub: 'Higher = better. Tap a cell to drill.',
        rows: DISTRICTS.map(d => ({
          label: d.name,
          values: [
            { label: 'Att',  value: Math.round(d.attendance) },
            { label: 'Sch%', value: Math.round(d.scholarshipRate) },
            { label: 'XAMTA', value: 60 + Math.round((d.attendance - 80) * 2.5) },
            { label: 'LO',   value: 55 + Math.round((d.scholarshipRate - 75) * 2) },
          ],
        })),
        scale: 'cool',
      })}
    </div>`
  return { title: 'District Dashboard', icon: '🏛️', html }
}

function buildStateDashboard() {
  const s = STATE_SUMMARY || {}
  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'State Command — Gujarat',
        subtitle: `Ministry of Education · ${TODAY}`,
        badge: '33 districts',
        gradient: true,
      })}
      ${kpiGrid([
        { label: 'Total Schools',    value: fmtNum(s.totalSchools || 33248),    tone: 'brand',   icon: '🏫', sub: '33 districts' },
        { label: 'Total Students',   value: fmtNum(s.totalStudents || 8240000), tone: 'purple',  icon: '👥', sub: '0–18 yrs · K-12' },
        { label: 'Avg Attendance',   value: (s.avgAttendance || 85.4) + '%',     tone: 'success', icon: '📅', trend: { delta: '+1.2%', up: true } },
        { label: 'Scheme Coverage',  value: (s.scholarshipRate || 79.8) + '%',   tone: 'warning', icon: '🏅', trend: { delta: '+3.4%', up: true } },
        { label: 'Teachers',         value: fmtNum(s.totalTeachers || 280000),  tone: 'teal',    icon: '👨‍🏫', sub: 'state-wide' },
        { label: 'Risk students',    value: fmtNum(s.riskStudents || 182400),   tone: 'error',   icon: '⚠️', sub: 'requires intervention' },
      ])}

      ${lineChart({
        title: 'State-wide attendance — 30 days',
        sub: 'Aggregated across 33,248 schools',
        labels: ATTENDANCE_30D.labels,
        series: [{ name: 'State', color: CHART.brand, values: ATTENDANCE_30D.state }],
        height: 200,
      })}

      ${funnel({
        title: 'Scholarship funnel — Gujarat',
        sub: 'Namo Laxmi + Namo Saraswati combined',
        stages: SCHOLARSHIP_FUNNEL.state,
      })}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${barChart({
          title: 'Monthly disbursement',
          sub: '₹ Cr · last 6 months',
          items: MONTHLY_DISBURSEMENT.labels.map((m, i) => ({
            label: m,
            value: MONTHLY_DISBURSEMENT.state.disbursed[i],
            sub: '₹' + MONTHLY_DISBURSEMENT.state.disbursed[i] + ' Cr',
            color: i === MONTHLY_DISBURSEMENT.labels.length - 1 ? CHART.brand : CHART.brandSubtleStrong,
          })),
          suffix: '',
        })}
        ${donut({
          title: 'Risk-tier distribution',
          sub: 'State students flagged',
          centerValue: fmtNum(s.riskStudents || 182400),
          centerLabel: 'flagged',
          segments: [
            { label: 'High risk',   value: 38000, color: CHART.error },
            { label: 'Medium risk', value: 86400, color: CHART.warning },
            { label: 'Low risk',    value: 58000, color: CHART.success },
          ],
        })}
      </div>

      ${hBarList({
        title: 'Top 8 districts — attendance',
        sub: 'Best to worst · this month',
        items: [...DISTRICTS]
          .sort((a, b) => b.attendance - a.attendance)
          .map(d => ({
            label: d.name,
            value: d.attendance,
            color: d.attendance >= 87 ? CHART.success : d.attendance >= 83 ? CHART.brand : CHART.warning,
            sub: `${fmtNum(d.students)} students`,
          })),
      })}

      ${heatmap({
        title: 'District performance heatmap',
        sub: 'Attendance · Scholarship · LO mastery · XAMTA scan coverage',
        rows: DISTRICTS.map(d => ({
          label: d.name,
          values: [
            { label: 'Att',     value: Math.round(d.attendance) },
            { label: 'Sch',     value: Math.round(d.scholarshipRate) },
            { label: 'LO',      value: 55 + Math.round((d.scholarshipRate - 75) * 2.5) },
            { label: 'XAMTA',   value: 50 + Math.round((d.attendance - 80) * 3) },
          ],
        })),
      })}
    </div>`
  return { title: 'State Dashboard', icon: '🏛️', html }
}

function buildLearningOutcomesArtifact() {
  const lo = LEARNING_OUTCOMES || {}
  const subjects = Object.keys(lo)

  // Aggregate per-subject mastery (avg of all outcomes / all grades).
  const subjectAvg = subjects.map(sub => {
    const all = lo[sub].flatMap(o => [o.grade3, o.grade5, o.grade8])
    return { name: sub, value: Math.round(all.reduce((s, x) => s + x, 0) / all.length) }
  })

  const html = `
    <div style="font-family:${DS.font};padding:0 4px;color:${DS.textPrimary}">
      ${sectionHeader({
        title: 'Learning Outcomes',
        subtitle: `${SCHOOL} · GCERT-aligned mastery from XAMTA scans`,
        badge: subjects.length + ' subjects',
        gradient: true,
      })}
      ${kpiGrid(subjectAvg.map((s, i) => ({
        label: s.name,
        value: s.value + '%',
        tone: ['brand', 'purple', 'success', 'warning'][i % 4],
        icon: ['🔢', '🔬', '📖', '✏️'][i % 4],
        sub: s.value >= 75 ? 'on track' : s.value >= 60 ? 'monitoring' : 'needs intervention',
      })))}

      ${barChart({
        title: 'Subject mastery — overall',
        sub: 'Average across all grades + outcomes',
        items: subjectAvg.map((s, i) => ({
          label: s.name,
          value: s.value,
          color: [CHART.brand, CHART.purple, CHART.success, CHART.warning][i % 4],
        })),
        height: 160,
      })}

      ${subjects.map((sub, i) => {
        const items = lo[sub] || []
        return heatmap({
          title: sub + ' · outcome × grade',
          sub: 'Mastery % · greener = stronger',
          rows: items.map(item => ({
            label: item.outcome,
            values: [
              { label: 'Grade 3', value: item.grade3 || 0 },
              { label: 'Grade 5', value: item.grade5 || 0 },
              { label: 'Grade 8', value: item.grade8 || 0 },
            ],
          })),
          scale: 'cool',
        })
      }).join('')}

      ${chartUi.panelStart()}
        <h4 style="font-size:14px;font-weight:600;margin:0 0 8px;color:${DS.textPrimary}">💡 Recommended actions</h4>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${subjectAvg.filter(s => s.value < 70).map(s => `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid ${CHART.warningSubtle};background:${CHART.warningSubtle}66;border-radius:10px">
              <span style="font-size:16px">⚠️</span>
              <div style="font-size:12px;color:${CHART.warningText};line-height:1.5">
                <strong>${s.name}</strong> at ${s.value}% — schedule remediation for the bottom 2 outcomes; consider grade-specific intervention.
              </div>
            </div>`).join('') || `
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px;border:1px solid ${CHART.successSubtle};background:${CHART.successSubtle}66;border-radius:10px">
              <span style="font-size:16px">✅</span>
              <div style="font-size:12px;color:${CHART.successText};line-height:1.5">All subjects above the intervention threshold. Keep up the focus on the lower-performing outcomes.</div>
            </div>`}
        </div>
      ${chartUi.panelEnd()}
    </div>`
  return { title: 'Learning Outcomes', icon: '🎯', html }
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE CHAT CARDS (rendered inside message bubbles)
// ─────────────────────────────────────────────────────────────────────────────
function buildInlineAttendanceHtml(grade) {
  const students = STUDENTS[grade] || STUDENTS[8]
  return `
    <div style="margin-top:8px;font-family:${DS.font}">
      <div style="font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textSecondary};margin-bottom:12px">
        <strong style="font-weight:600;color:${DS.textPrimary}">${SCHOOL}</strong> · Grade ${grade} · ${TODAY}<br>
        Tap a name to toggle Present / Absent
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px" id="att-grid">
        ${students.map(s => {
          const short = s.name.split(' ').map(w => w[0] + w.slice(1,5)).join(' ')
          return `<div onclick="window._vskToggle(this)" data-n="${short}" data-status="present"
            style="padding:8px 4px;border-radius:${DS.radiusFull}px;text-align:center;font-size:11px;font-weight:500;letter-spacing:0.2px;cursor:pointer;border:1.5px solid ${DS.success};background:${DS.successSubtle};color:${DS.successText};user-select:none;transition:all .12s;font-family:${DS.font}"
          >✓ ${short}</div>`
        }).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary};margin-bottom:8px">
        <span>Total: <strong style="color:${DS.textPrimary};font-weight:600">${students.length}</strong></span>
        <span id="att-summary">Present: <strong style="color:${DS.successText};font-weight:600">${students.length}</strong> · Absent: <strong style="color:${DS.errorText};font-weight:600">0</strong></span>
      </div>
    </div>`
}

function buildInlineAtRiskHtml() {
  const students = AT_RISK_STUDENTS || []
  const rows = students.map(s => {
    const riskColor = s.risk === 'high' ? DS.errorText : DS.warningText
    const riskBg = s.risk === 'high' ? DS.errorSubtle : DS.warningSubtle
    return `<div style="display:flex;align-items:center;padding:12px;border-bottom:1px solid ${DS.borderSubtle};gap:8px">
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${DS.textPrimary}">${s.name}</div>
        <div style="color:${DS.textTertiary};font-size:11px;font-weight:500;letter-spacing:0.2px;margin-top:2px">${s.reason||'Low attendance'}</div>
      </div>
      <span style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary}">Att: <strong style="color:${DS.textPrimary};font-weight:600">${s.attendance}%</strong></span>
      <span style="background:${riskBg};color:${riskColor};font-size:10px;font-weight:500;letter-spacing:0.2px;padding:2px 8px;border-radius:${DS.radiusFull}px">${(s.risk||'').toUpperCase()}</span>
    </div>`
  }).join('')
  const high = students.filter(s=>s.risk==='high').length
  return `
    <div style="margin-top:8px;font-family:${DS.font}">
      <div style="font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textSecondary};margin-bottom:8px"><strong style="color:${DS.textPrimary};font-weight:600">⚠️ ${students.length} students at risk</strong> (${high} high risk)</div>
      <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;overflow:hidden;background:${DS.surfaceRaised}">${rows}</div>
    </div>`
}

function buildInlineScholarshipHtml() {
  const schemes = SCHOLARSHIP_DATA || []
  return `
    <div style="margin-top:8px;font-family:${DS.font}">
      ${schemes.map(s => {
        const pct = Math.round(s.approved / s.eligible * 100)
        const barColor = pct >= 80 ? DS.success : pct >= 60 ? DS.warning : DS.error
        return `<div style="background:${DS.brandSubtle};border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;padding:12px;margin-bottom:8px">
          <div style="font-size:14px;font-weight:600;letter-spacing:0.1px;color:${DS.brandTextSubdued};margin-bottom:8px">${s.name}</div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textPrimary};padding:4px 0;border-bottom:1px solid ${DS.borderSubtle}">
            <span>Eligible</span><strong style="font-weight:600">${s.eligible}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textPrimary};padding:4px 0;border-bottom:1px solid ${DS.borderSubtle}">
            <span>Applied</span><strong style="font-weight:600">${s.applied}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textPrimary};padding:4px 0">
            <span>Approved</span><strong style="color:${barColor};font-weight:600">${s.approved} (${pct}%)</strong>
          </div>
        </div>`
      }).join('')}
    </div>`
}

function buildInlineNamoLaxmiHtml() {
  const apps = NAMO_LAXMI_APPS || []
  const statusIcon = s => ({ approved:'✅', pending:'⏳', rejected:'❌' })[s] || '❓'
  const statusColor = s => ({ approved:DS.successText, pending:DS.warningText, rejected:DS.errorText })[s] || DS.textSecondary
  const statusBg = s => ({ approved:DS.successSubtle, pending:DS.warningSubtle, rejected:DS.errorSubtle })[s] || DS.borderSubtle
  const docIcon = ok => ok ? '✅' : '❌'
  const approved = apps.filter(a=>a.status==='approved').length
  const pending = apps.filter(a=>a.status==='pending').length
  const rejected = apps.filter(a=>a.status==='rejected').length

  const cards = apps.map((a, idx) => `
    <div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;margin-bottom:8px;overflow:hidden;background:${DS.surfaceRaised}">
      <div style="display:flex;align-items:center;padding:12px;gap:8px;cursor:pointer" onclick="window._vskToggleNL?.(${idx})">
        <div style="width:32px;height:32px;border-radius:${DS.radiusFull}px;background:${statusBg(a.status)};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${statusIcon(a.status)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${DS.textPrimary}">${a.studentName}</div>
          <div style="font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textTertiary}">Grade ${a.grade}-${a.section} · ${a.appId}</div>
        </div>
        <span style="background:${statusBg(a.status)};color:${statusColor(a.status)};font-size:10px;font-weight:500;letter-spacing:0.2px;padding:2px 8px;border-radius:${DS.radiusFull}px;text-transform:capitalize">${a.status}</span>
        <span style="font-size:12px;color:${DS.textTertiary}" id="nl-arrow-${idx}">▼</span>
      </div>
      <div id="nl-detail-${idx}" style="display:none;padding:0 12px 12px;border-top:1px solid ${DS.borderSubtle}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;font-weight:500;letter-spacing:0.2px;margin-top:12px;color:${DS.textPrimary}">
          <div><span style="color:${DS.textTertiary}">Father:</span> <strong style="font-weight:600">${a.fatherName}</strong></div>
          <div><span style="color:${DS.textTertiary}">Mother:</span> <strong style="font-weight:600">${a.motherName}</strong></div>
          <div><span style="color:${DS.textTertiary}">DOB:</span> ${a.dob}</div>
          <div><span style="color:${DS.textTertiary}">Phone:</span> ${a.phone}</div>
          <div><span style="color:${DS.textTertiary}">Student Aadhaar:</span> ${a.studentAadhaar}</div>
          <div><span style="color:${DS.textTertiary}">Mother Aadhaar:</span> ${a.motherAadhaar}</div>
          <div><span style="color:${DS.textTertiary}">Bank A/C:</span> ${a.bankAcc}</div>
          <div><span style="color:${DS.textTertiary}">IFSC:</span> ${a.ifsc}</div>
        </div>
        <div style="margin-top:12px;font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary};text-transform:uppercase">Documents</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;font-size:10px;font-weight:400;letter-spacing:0.2px">
          <span style="background:${DS.surface};padding:4px 8px;border-radius:${DS.radiusFull}px;color:${DS.textPrimary}">${docIcon(a.docs?.aadhaar)} Aadhaar</span>
          <span style="background:${DS.surface};padding:4px 8px;border-radius:${DS.radiusFull}px;color:${DS.textPrimary}">${docIcon(a.docs?.pan)} PAN</span>
          <span style="background:${DS.surface};padding:4px 8px;border-radius:${DS.radiusFull}px;color:${DS.textPrimary}">${docIcon(a.docs?.income)} Income Cert</span>
          <span style="background:${DS.surface};padding:4px 8px;border-radius:${DS.radiusFull}px;color:${DS.textPrimary}">${docIcon(a.docs?.lc)} LC</span>
          <span style="background:${DS.surface};padding:4px 8px;border-radius:${DS.radiusFull}px;color:${DS.textPrimary}">${docIcon(a.docs?.passbook)} Passbook</span>
        </div>
        ${a.reason ? `<div style="margin-top:8px;font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.errorText};background:${DS.errorSubtle};padding:8px 12px;border-radius:${DS.radiusMd}px">⚠️ ${a.reason}</div>` : ''}
        ${a.status === 'rejected' || a.status === 'pending' ? `
          <div style="display:flex;gap:8px;margin-top:12px">
            <button onclick="window._vskNLAction?.('edit',${idx})" style="flex:1;padding:8px 12px;border:1.5px solid ${DS.brand};color:${DS.brand};background:${DS.surfaceDefault};border-radius:${DS.radiusFull}px;font-size:12px;font-weight:500;letter-spacing:0.25px;cursor:pointer;font-family:${DS.font}">✏️ Edit Form</button>
            <button onclick="window._vskNLAction?.('resubmit',${idx})" style="flex:1;padding:8px 12px;border:1.5px solid ${DS.success};color:${DS.successText};background:${DS.surfaceDefault};border-radius:${DS.radiusFull}px;font-size:12px;font-weight:500;letter-spacing:0.25px;cursor:pointer;font-family:${DS.font}">🔄 Re-submit</button>
          </div>` : `
          <div style="margin-top:12px">
            <button onclick="window._vskNLAction?.('view',${idx})" style="width:100%;padding:8px 12px;border:1.5px solid ${DS.brand};color:${DS.brand};background:${DS.surfaceDefault};border-radius:${DS.radiusFull}px;font-size:12px;font-weight:500;letter-spacing:0.25px;cursor:pointer;font-family:${DS.font}">👁️ View Full Form</button>
          </div>`}
      </div>
    </div>`).join('')

  return `
    <div style="margin-top:8px;font-family:${DS.font}">
      <div style="display:flex;gap:8px;margin-bottom:12px;font-size:11px;font-weight:500;letter-spacing:0.2px;text-align:center">
        <div style="flex:1;background:${DS.successSubtle};border-radius:${DS.radiusMd}px;padding:8px;color:${DS.successText}"><div style="font-size:20px;font-weight:600;line-height:24px;margin-bottom:2px">${approved}</div>Approved</div>
        <div style="flex:1;background:${DS.warningSubtle};border-radius:${DS.radiusMd}px;padding:8px;color:${DS.warningText}"><div style="font-size:20px;font-weight:600;line-height:24px;margin-bottom:2px">${pending}</div>Pending</div>
        <div style="flex:1;background:${DS.errorSubtle};border-radius:${DS.radiusMd}px;padding:8px;color:${DS.errorText}"><div style="font-size:20px;font-weight:600;line-height:24px;margin-bottom:2px">${rejected}</div>Rejected</div>
      </div>
      <div style="font-size:11px;font-weight:400;letter-spacing:0.2px;color:${DS.textSecondary};margin-bottom:8px">Tap a student to view details, edit, or re-submit</div>
      ${cards}
    </div>`
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS  (trigger chat flows)
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = {
  teacher: [
    { icon: Sparkles,      label: 'Ask AI',            bg: '#F4EEFF', fg: '#7C3AED', trigger: 'Task: ask_ai',           subtitle: 'Smart actions & insights' },
    { icon: CalendarCheck, label: 'Mark\nAttendance',  bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: attendance'        },
    { icon: BarChart3,     label: 'Class\nDashboard',  bg: '#EEF2FF', fg: '#4F46E5', trigger: 'Task: dashboard'          },
    { icon: ScanLine,      label: 'XAMTA\nScan',       bg: '#E8F5E9', fg: '#16A34A', trigger: 'XAMTA scan'               },
    { icon: Award,         label: 'Namo\nLaxmi',       bg: '#F3E5F5', fg: '#9333EA', trigger: 'Task: namo_laxmi'        },
    { icon: GraduationCap, label: 'DigiVritti\nScholarships', bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'      },
    { icon: AlertTriangle, label: 'At-Risk\nStudents', bg: '#FEF2F2', fg: '#DC2626', trigger: 'Task: at_risk'           },
    { icon: MessageSquare, label: 'Parent\nAlert',     bg: '#E3F2FD', fg: '#1D4ED8', trigger: 'parent alert'             },
    { icon: FileText,      label: 'Generate\nReport',  bg: '#F0F4FF', fg: '#3730A3', trigger: 'Task: report_card'        },
    { icon: BookOpen,      label: 'Lesson\nPlan',      bg: '#E8F5E9', fg: '#059669', trigger: 'Task: lesson_plan'        },
  ],
  principal: [
    { icon: Sparkles,      label: 'Ask AI',            bg: '#F4EEFF', fg: '#7C3AED', trigger: 'Task: ask_ai',           subtitle: 'Smart actions & insights' },
    { icon: BarChart3,     label: 'School\nDashboard', bg: '#EEF2FF', fg: '#4F46E5', trigger: 'Task: dashboard'          },
    { icon: CalendarCheck, label: 'Attendance\nSummary', bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: attendance'       },
    { icon: MessageSquare, label: 'Parent\nOutreach',  bg: '#F3E5F5', fg: '#9333EA', trigger: 'parent alert'             },
    { icon: AlertTriangle, label: 'War Room',          bg: '#FEF2F2', fg: '#DC2626', trigger: 'anomaly alerts'           },
    { icon: TrendingUp,    label: 'Class\nPerf.',      bg: '#E8F5E9', fg: '#16A34A', trigger: 'Task: class_performance'  },
    { icon: Award,         label: 'DBT\nStatus',       bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: scholarship'        },
    { icon: GraduationCap, label: 'DigiVritti\nReview',bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'              },
    { icon: FileText,      label: 'Generate\nPDF',     bg: '#E3F2FD', fg: '#1D4ED8', trigger: 'Task: report_card'        },
    { icon: AlertTriangle, label: 'At-Risk\nStudents', bg: '#FEF2F2', fg: '#DC2626', trigger: 'Task: at_risk'           },
  ],
  deo: [
    { icon: Sparkles,      label: 'Ask AI',            bg: '#F4EEFF', fg: '#7C3AED', trigger: 'Task: ask_ai',            subtitle: 'Smart actions & insights' },
    { icon: Building2,     label: 'District\nDash.',   bg: '#EEF2FF', fg: '#4F46E5', trigger: 'Task: district_dashboard' },
    { icon: Award,         label: 'DBT\nReport',       bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: scholarship'        },
    { icon: AlertTriangle, label: 'War Room',          bg: '#FEF2F2', fg: '#DC2626', trigger: 'anomaly alerts'           },
    { icon: BarChart3,     label: 'Block\nAnalysis',   bg: '#E8F5E9', fg: '#16A34A', trigger: 'Task: class_performance'  },
    { icon: CalendarCheck, label: 'Att.\nSummary',     bg: '#F3E5F5', fg: '#9333EA', trigger: 'Task: attendance'         },
    { icon: GraduationCap, label: 'Learning\nOutcomes',bg: '#E3F2FD', fg: '#1D4ED8', trigger: 'Task: learning_outcomes'  },
    { icon: TrendingUp,    label: 'Critical\nAlerts',  bg: '#FEF2F2', fg: '#DC2626', trigger: 'anomaly alerts'           },
    { icon: Award,         label: 'DigiVritti\nDistrict', bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'           },
    { icon: FileText,      label: 'District\nReport',  bg: '#F0F4FF', fg: '#3730A3', trigger: 'Task: report_card'        },
  ],
  state_secretary: [
    { icon: Sparkles,      label: 'Ask AI',            bg: '#F4EEFF', fg: '#7C3AED', trigger: 'Task: ask_ai',            subtitle: 'Smart actions & insights' },
    { icon: Map,           label: 'State\nDashboard',  bg: '#EEF2FF', fg: '#4F46E5', trigger: 'Task: state_dashboard'    },
    { icon: Building2,     label: 'District\nDrilldown',bg: '#E8F5E9',fg: '#16A34A', trigger: 'Task: district_dashboard' },
    { icon: Award,         label: 'Scheme\nAnalytics', bg: '#F3E5F5', fg: '#9333EA', trigger: 'Task: namo_laxmi'        },
    { icon: AlertTriangle, label: 'War Room',          bg: '#FEF2F2', fg: '#DC2626', trigger: 'anomaly alerts'           },
    { icon: Brain,         label: 'Learning\nOutcomes',bg: '#E3F2FD', fg: '#1D4ED8', trigger: 'Task: learning_outcomes'  },
    { icon: TrendingUp,    label: 'Dropout\nRisk',     bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: at_risk'           },
    { icon: BarChart3,     label: 'DBT\nDisbursal',    bg: '#E8F5E9', fg: '#059669', trigger: 'Task: scholarship'        },
    { icon: GraduationCap, label: 'DigiVritti\nState', bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'              },
    { icon: FileText,      label: 'Policy\nAdvisor',   bg: '#F0F4FF', fg: '#3730A3', trigger: 'policy advisor'           },
  ],
  // Parent — only views about their own child (attendance, results, homework,
  // teacher message, report card). No DigiVritti / scholarship / school-wide
  // controls.
  parent: [
    { icon: CalendarCheck, label: "Ravi's\nAttendance",  bg: '#FFF8E1', fg: '#D97706', trigger: 'Task: attendance'      },
    { icon: TrendingUp,    label: 'Latest\nResult',      bg: '#E8F5E9', fg: '#16A34A', trigger: "my child's latest result" },
    { icon: BookOpen,      label: 'Homework',            bg: '#EEF2FF', fg: '#4F46E5', trigger: 'homework due'             },
    { icon: MessageSquare, label: 'Message\nTeacher',    bg: '#E3F2FD', fg: '#1D4ED8', trigger: 'parent alert'             },
    { icon: FileText,      label: 'Download\nReport',    bg: '#F0F4FF', fg: '#3730A3', trigger: 'Task: report_card'        },
  ],
  // PFMS · Payment Officer — sees ONLY payment-side DigiVritti actions.
  // No Mark Attendance / XAMTA / generic dashboards.
  pfms: [
    { icon: Award,         label: 'DigiVritti\nPayments',  bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'                  },
    { icon: BarChart3,     label: 'Payment\nQueue',        bg: '#EEF2FF', fg: '#4F46E5', trigger: 'dv:canvas:payment-queue'           },
    { icon: AlertTriangle, label: 'Failed\nPayments',      bg: '#FEF2F2', fg: '#DC2626', trigger: 'dv:canvas:payment-queue:failed'    },
    { icon: TrendingUp,    label: 'UTR\nSuccess',          bg: '#E8F5E9', fg: '#16A34A', trigger: 'dv:canvas:payment-queue:success'   },
    { icon: Building2,     label: 'District\nSuccess Rate',bg: '#F0F4FF', fg: '#3730A3', trigger: 'dv:s:districts'                    },
    { icon: FileText,      label: 'Sanctioned vs\nDisbursed',bg:'#FFF8E1',fg: '#D97706', trigger: 'dv:s:metrics'                      },
  ],
  // CRC · Cluster Approver — review-only DigiVritti actions.
  crc: [
    { icon: Sparkles,      label: 'Ask AI',                bg: '#F4EEFF', fg: '#7C3AED', trigger: 'Task: ask_ai',           subtitle: 'Smart actions & insights' },
    { icon: Award,         label: 'DigiVritti\nApprover',  bg: '#FCE4EC', fg: '#E91E63', trigger: 'Task: digivritti'                  },
    { icon: AlertTriangle, label: 'Pending\nReviews',      bg: '#FFF8E1', fg: '#D97706', trigger: 'dv:canvas:review'                  },
    { icon: TrendingUp,    label: 'Resubmitted\nQueue',    bg: '#EEF2FF', fg: '#4F46E5', trigger: 'dv:canvas:review:resub'             },
    { icon: BarChart3,     label: 'Approval\nSummary',     bg: '#E8F5E9', fg: '#16A34A', trigger: 'dv:a:metrics'                      },
    { icon: Brain,         label: 'Ask Approver\nAI',      bg: '#F3E5F5', fg: '#9333EA', trigger: 'dv:a:ai'                           },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION ROUTER
// ─────────────────────────────────────────────────────────────────────────────
const TASK_FLOWS = {
  attendance: {
    triggers: ['attendance','mark attendance','mark','present','absent','task: attendance','task:attendance','haajri'],
    steps: [{ key:'grade', prompt:'Which class?', opts:['6-A','6-B','7-A','7-B','8-A','8-B'] }],
    progress: ['Fetching student roster...', 'Loading attendance records...', 'Opening attendance canvas...'],
    done: (ctx) => `📋 Opened attendance for Class ${ctx.grade || '6-B'} — tap students on the right to mark.`,
    // Open the AttendanceCanvas right-side webview instead of an inline chat
    // bubble. The canvas is the single source of truth for marking + submit.
    openCanvasOnComplete: (ctx) => ({ type: 'attendance', classId: ctx.grade || '6-B' }),
  },
  at_risk: {
    triggers: ['at-risk','at risk','risk','task: at_risk','task:at_risk','dropout','struggling'],
    steps: [],
    inline: true,
    progress: ['Analyzing attendance patterns...', 'Calculating risk scores...', 'Identifying at-risk students...'],
    done: () => '⚠️ Here are the at-risk students for your school:',
    buildInline: () => buildInlineAtRiskHtml(),
    actions: [
      { label: '📨 Send parent alerts', trigger: 'parent alert', variant: 'err' },
      { label: '📈 Attendance plan', trigger: 'Task: attendance', variant: 'primary' },
    ],
  },
  lesson_plan: {
    triggers: ['lesson','lesson plan','lesson_plan','task: lesson_plan','task:lesson_plan','create lesson','make lesson'],
    steps: [
      { key:'subject', prompt:'Which subject?', opts:['Mathematics','Science','Gujarati'] },
      { key:'grade',   prompt:'Which grade?',   opts:['3','5','6','8'] },
      { key:'topic',   prompt:'What topic?' },
    ],
    progress: ['Analyzing curriculum...', 'Generating activities...', 'Building lesson plan...'],
    done: '📋 Your lesson plan is ready! Tap the card to view full details.',
    build: (ctx) => buildLessonPlanArtifact(ctx),
  },
  class_performance: {
    triggers: ['performance','class performance','class_performance','task: class_performance','task:class_performance','scores','grades','block analysis'],
    steps: [{ key:'grade', prompt:'Which grade?', opts:['All','3','5','6'] }],
    progress: ['Querying scores database...', 'Calculating averages...', 'Building dashboard...'],
    done: '📊 Performance dashboard ready. Tap the card to explore.',
    build: (ctx) => buildPerformanceArtifact(ctx),
  },
  report_card: {
    triggers: ['report card','report_card','task: report_card','task:report_card','generate report'],
    steps: [
      { key:'grade',   prompt:'Which grade?',   opts:['3','5','6','8'] },
      { key:'student', prompt:'Which student?', opts:['All Students','Ravi Parmar','Komal Patel','Ananya Pandya'] },
    ],
    progress: ['Fetching student data...', 'Generating report card...', 'Preparing PDF...'],
    done: '📄 Report card generated! Tap to view or download.',
    build: (ctx) => buildReportCardArtifact(ctx),
  },
  scholarship: {
    triggers: ['scholarship','dbt','ews','task: scholarship','task:scholarship','dbt status','dbt report','dbt disbursal'],
    steps: [],
    inline: true,
    progress: ['Loading scholarship records...', 'Checking disbursement status...'],
    done: () => `🏅 Scholarship status for ${SCHOOL}:`,
    buildInline: () => buildInlineScholarshipHtml(),
    actions: [
      { label: '📊 Full report', trigger: 'Task: dashboard', variant: 'primary' },
      { label: '🌸 Namo Laxmi', trigger: 'Task: namo_laxmi', variant: 'primary' },
    ],
  },
  namo_laxmi: {
    triggers: ['namo laxmi','namo_laxmi','task: namo_laxmi','task:namo_laxmi','scheme analytics','namo','laxmi','nly'],
    steps: [],
    inline: true,
    progress: ['Loading Namo Laxmi records...', 'Checking application statuses...', 'Fetching form details...'],
    done: () => `🌸 Namo Laxmi Yojana — ${NAMO_LAXMI_APPS?.length || 0} applications found:`,
    buildInline: () => buildInlineNamoLaxmiHtml(),
    actions: [
      { label: '📊 Scholarship overview', trigger: 'Task: scholarship', variant: 'primary' },
    ],
  },
  dashboard: {
    triggers: ['dashboard','school dashboard','task: dashboard','task:dashboard','kpi','attendance summary'],
    steps: [],
    progress: ['Connecting to school database...', 'Loading KPIs...', 'Building dashboard...'],
    done: '📊 School dashboard ready. Tap the card to explore.',
    build: () => buildDashboardArtifact({ scope:'school' }),
  },
  district_dashboard: {
    triggers: ['district dashboard','district_dashboard','task: district_dashboard','task:district_dashboard','district drilldown','block analysis'],
    steps: [],
    progress: ['Aggregating district data...', 'Processing 412 schools...', 'Building overview...'],
    done: '📊 District dashboard ready. Tap the card to explore.',
    build: () => buildDashboardArtifact({ scope:'district' }),
  },
  state_dashboard: {
    triggers: ['state dashboard','state_dashboard','task: state_dashboard','task:state_dashboard','state kpi','state intelligence','dropout risk'],
    steps: [],
    progress: ['Connecting to state EMIS...', 'Aggregating 33 districts...', 'Processing 33,248 schools...', 'Building command center...'],
    done: '🏛️ State command center ready. Tap the card to explore.',
    build: () => buildDashboardArtifact({ scope:'state' }),
  },
  learning_outcomes: {
    triggers: ['learning outcomes','learning_outcomes','task: learning_outcomes','task:learning_outcomes','lo','outcomes'],
    steps: [],
    progress: ['Loading XAMTA results...', 'Analyzing learning outcomes...', 'Building report...'],
    done: '🎯 Learning outcomes report ready. Tap to view.',
    build: () => buildLearningOutcomesArtifact(),
  },
}

function detectTask(text) {
  const q = text.toLowerCase().trim()
  for (const [id, flow] of Object.entries(TASK_FLOWS)) {
    if (flow.triggers.some(t => q === t || q.includes(t))) return id
  }
  return null
}

// Time-aware greeting
const HOUR = new Date().getHours()
const TIME_GREET = HOUR < 12 ? 'Good morning' : HOUR < 17 ? 'Good afternoon' : 'Good evening'

function greetingReply(text, _botName, role, profile) {
  const q = text.toLowerCase().trim()
  const words = q.split(/\s+/)
  if (!(words.includes('hi') || words.includes('hello') || words.includes('namaste') ||
      q.includes('नमस्ते') || q === 'start demo' || words.includes('hey'))) return null

  const name = profile?.name?.split(' ')[0] || 'there'
  const alerts = []
  if (role === 'teacher' || role === 'principal') {
    // Use the same cohort builder as the canvas + the At-Risk home tile.
    const risk = getAtRiskCohort(role, profile, {}).atRisk.total
    if (risk > 0) alerts.push(`⚠️ ${risk} students flagged at risk`)
    const pending = NAMO_LAXMI_APPS?.filter(a => a.status === 'pending')?.length || 0
    if (pending > 0) alerts.push(`📋 ${pending} Namo Laxmi applications pending review`)
  }
  if (role === 'deo') alerts.push('📊 2 schools below 75% attendance threshold')
  if (role === 'state_secretary') alerts.push(`🏛️ ${STATE_SUMMARY?.districtCount || 33} districts reporting — 3 need attention`)
  if (role === 'parent') alerts.push(`📚 ${profile?.childName || 'Your child'}'s attendance: 74% this month`)

  const alertText = alerts.length ? '\n\n' + alerts.join('\n') : ''
  const roleHint = {
    teacher: "I can mark attendance, create lesson plans, scan XAMTA sheets, track scholarships, and more.",
    principal: "I can show school dashboards, at-risk alerts, teacher reports, and parent outreach tools.",
    deo: "I can provide district analytics, block-wise reports, war room alerts, and intervention insights.",
    state_secretary: "I can show statewide KPIs, district drilldowns, scheme analytics, and policy insights.",
    parent: `I can show ${profile?.childName || "your child"}'s attendance, grades, scholarship status, and connect you with teachers.`,
  }

  return `${TIME_GREET}, ${name}! 👋${alertText}\n\n${roleHint[role] || roleHint.teacher}\n\nWhat would you like to do?`
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Roles offered in the bottom-left user switcher. Order = hierarchy from
// classroom → state. BEO (Block) was missing — added between CRC and DEO so
// the chain reads Teacher → Principal → CRC → BEO → DEO → State.
const SWITCHABLE_ROLES = [
  { id: 'teacher',         label: 'Teacher',          sublabel: 'Priya Mehta · GPS Mehsana' },
  { id: 'principal',       label: 'Principal',        sublabel: 'Rakesh Joshi · GPS Mehsana' },
  { id: 'crc',             label: 'CRC · Cluster Approver', sublabel: 'Mehul Parmar · Anand-6' },
  { id: 'beo',             label: 'BEO · Block Education Officer', sublabel: 'Hetal Vyas · Anand Block' },
  { id: 'deo',             label: 'DEO',              sublabel: 'Amit Trivedi · Ahmedabad' },
  { id: 'state_secretary', label: 'State Secretary',  sublabel: 'Nidhi Shah · Gujarat' },
  { id: 'pfms',            label: 'PFMS · Payment Officer', sublabel: 'Farida Shaikh · PFMS Gujarat' },
]

function VSKSidebar({ onNew, activeChatId, chatGroups, onSelect, onDelete, role, userProfile, onClose, onSwitchRole, onNavigate, onSignOut }) {
  const meta = userProfile || ROLE_META[role] || ROLE_META.teacher
  const initial = (meta.name || 'U')[0].toUpperCase()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef(null)

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!switcherOpen) return
    const onDocClick = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false)
      }
    }
    const onKey = (e) => { if (e.key === 'Escape') setSwitcherOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [switcherOpen])
  // Title/Large: 16px Bold; Caption: 11px Medium
  const titleLarge = { fontSize: 16, fontWeight: 700, lineHeight: '20px', fontFamily: 'Montserrat, sans-serif' }
  const caption    = { fontSize: 11, fontWeight: 500, lineHeight: '14px', letterSpacing: '0.2px', fontFamily: 'Montserrat, sans-serif' }
  return (
    <div className="flex flex-col h-full bg-white border-r" style={{ width: 260, borderRightColor: '#D5D8DF' }}>
      {/* Logo + new */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderBottomColor: '#ECECEC' }}>
        <div className="flex items-center gap-2">
          <img
            src="https://i.ibb.co/Xr1jqvd4/Logo-VSK-PNG.png"
            alt="VSK Gujarat"
            width={32}
            height={32}
            style={{ objectFit: 'contain', display: 'block' }}
            draggable={false}
          />
          <span style={{ ...titleLarge, color: '#0E0E0E' }}>VSK Gujarat</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onNew} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#ECECEC] transition-colors" style={{ color: '#7383A5' }}>
            <Plus size={16} />
          </button>
          {onClose && (
            <button onClick={onClose} className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#ECECEC]" style={{ color: '#7383A5' }}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full" style={{ background: '#ECECEC' }}>
          <Search size={14} className="flex-shrink-0" style={{ color: '#828996' }} />
          <input
            className="flex-1 bg-transparent outline-none placeholder:text-[#828996]"
            placeholder="Search chats..."
            style={{ fontSize: 14, fontWeight: 500, lineHeight: '20px', letterSpacing: '0.1px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}
          />
        </div>
      </div>

      {/* Top-level nav (Posts community) */}
      {onNavigate && (
        <div className="px-3 pb-2">
          <button
            onClick={() => onNavigate('posts')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors hover:bg-[#ECECEC]"
            style={{ color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}
          >
            <Newspaper size={16} style={{ color: '#386AF6' }} />
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px' }}>Posts</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#386AF6' }}>NEW</span>
          </button>
        </div>
      )}

      {/* History — real persisted chat sessions for the current user */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {(() => {
          const sections = chatGroups || {}
          const ordered = ['TODAY', 'YESTERDAY', 'PREVIOUS 7 DAYS', 'OLDER']
          const totalChats = ordered.reduce((n, k) => n + (sections[k]?.length || 0), 0)
          if (totalChats === 0) {
            return (
              <div className="px-4 py-6 text-center" style={{ ...caption, color: '#828996' }}>
                No chats yet. Click + to start one, or pick a Quick Action on the right.
              </div>
            )
          }
          return ordered.map(section => {
            const items = sections[section] || []
            if (items.length === 0) return null
            return (
              <div key={section} className="mb-3">
                <div className="px-3 py-2" style={{ ...caption, color: '#828996', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{section}</div>
                {items.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => onSelect && onSelect(chat.id)}
                    className="w-full text-left px-3 py-2 transition-colors"
                    style={{
                      fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', fontFamily: 'Montserrat, sans-serif',
                      borderRadius: 8,
                      background: activeChatId === chat.id ? '#ECECEC' : 'transparent',
                      color: activeChatId === chat.id ? '#0E0E0E' : '#7383A5',
                      fontWeight: activeChatId === chat.id ? 500 : 400,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    onMouseEnter={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = '#ECECEC' }}
                    onMouseLeave={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.title || 'New chat'}
                    </span>
                    {onDelete && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Delete chat"
                        onClick={(e) => { e.stopPropagation(); onDelete(chat.id) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(chat.id) } }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#828996', fontSize: 14, padding: '0 4px', cursor: 'pointer', display: 'inline-flex' }}
                      >×</span>
                    )}
                  </button>
                ))}
              </div>
            )
          })
        })()}
      </div>

      {/* User footer — click to switch user (no-login mode). */}
      <div className="relative border-t" style={{ borderTopColor: '#ECECEC' }} ref={switcherRef}>
        {switcherOpen && (
          <div
            className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: '0 8px 28px rgba(15, 23, 42, 0.18)', border: '1px solid #ECECEC', zIndex: 50 }}
          >
            <div className="px-3 py-2" style={{ ...caption, color: '#828996', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #ECECEC' }}>
              Switch user
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {SWITCHABLE_ROLES.map(opt => {
                const active = opt.id === role
                const profile = USER_PROFILES[opt.id]
                const optInitial = (profile?.name || opt.label)[0].toUpperCase()
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSwitcherOpen(false)
                      if (!active && onSwitchRole) onSwitchRole(opt.id)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                    style={{ background: active ? '#ECECEC' : 'transparent' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F4F5F7' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: profile?.color || '#386AF6', fontSize: 12, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
                    >
                      {optInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="truncate" style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>
                        {opt.label}
                      </div>
                      <div className="truncate" style={{ ...caption, color: '#828996' }}>{opt.sublabel}</div>
                    </div>
                    {active && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#386AF6', fontFamily: 'Montserrat, sans-serif' }}>Active</span>
                    )}
                  </button>
                )
              })}
            </div>
            {onSignOut && (
              <button
                onClick={() => { setSwitcherOpen(false); onSignOut() }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#FEE2E2]"
                style={{ borderTop: '1px solid #ECECEC', color: '#DC2626', fontFamily: 'Montserrat, sans-serif' }}
              >
                <LogOut size={16} />
                <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>Sign out</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={switcherOpen}
          className="w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors hover:bg-[#F4F5F7]"
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ background: userProfile?.color || '#386AF6', fontSize: 14, fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>{meta.name || meta.org}</div>
            <div className="truncate" style={{ ...caption, color: '#828996' }}>{meta.badge || meta.org}</div>
          </div>
          <span
            className="flex-shrink-0 transition-transform"
            style={{ color: '#7383A5', transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            aria-hidden="true"
          >
            <ChevronUp size={16} />
          </span>
        </button>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-end mb-2">
      <div className="w-7 h-7 rounded-full bg-[#386AF6] flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0">V</div>
      <div className="px-3 py-3 flex gap-1.5 items-center" style={{ background: '#ECECEC', borderRadius: '12px 12px 12px 2px' }}>
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-typing" style={{ background: '#7383A5', animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// Claude/ChatGPT-style streaming progress text
function ProgressText({ steps }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (idx < steps.length - 1) {
      const t = setTimeout(() => setIdx(i => i + 1), 900 + Math.random() * 500)
      return () => clearTimeout(t)
    }
  }, [idx, steps.length])
  return (
    <div className="flex gap-2 items-end mb-2">
      <div className="w-7 h-7 rounded-full bg-[#386AF6] flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0">V</div>
      <div className="px-3 py-3" style={{ background: '#ECECEC', borderRadius: '12px 12px 12px 2px' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
            {steps[idx]}
          </span>
          <span className="inline-flex gap-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full animate-typing" style={{ background: '#386AF6', animationDelay: `${i*0.2}s` }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  )
}

// Full-screen webview modal for expanded cards
function WebviewModal({ card, onClose }) {
  if (!card) return null
  const SESSION_TTL = 5 * 60 * 1000
  const isExpired = card.timestamp && (Date.now() - card.timestamp > SESSION_TTL)
  return (
    <>
      {/* Backdrop — mobile full, desktop right half */}
      <div className="absolute inset-0 z-40 bg-black/30 md:hidden" onClick={onClose} />
      <div
        data-webview
        className="absolute z-50 bg-white flex flex-col animate-slide-in shadow-xl
          inset-0 md:inset-y-0 md:left-auto md:right-0"
      >
      {/* On desktop: half width with border */}
      <style>{`.animate-slide-in { animation: slideIn 0.25s ease }
        @media(min-width:768px){ [data-webview]{ width:50% !important; min-width:380px; border-left:1px solid #D5D8DF } }`}</style>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0" style={{ background: '#FFFFFF', borderBottomColor: '#D5D8DF' }}>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#ECECEC]" style={{ color: '#0E0E0E' }}>
          <ArrowLeft size={18} />
        </button>
        <span className="text-[18px]">{card.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="truncate" style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>{card.title}</div>
          {card.subtitle && <div className="truncate" style={{ fontSize: 11, fontWeight: 500, lineHeight: '14px', letterSpacing: '0.2px', color: '#828996', fontFamily: 'Montserrat, sans-serif' }}>{card.subtitle}</div>}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] hover:bg-[#ECECEC] transition-colors"
          style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.25px', borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Upload size={12} /> Share
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] hover:bg-[#ECECEC] transition-colors"
          style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.25px', borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Download size={12} /> Download
        </button>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#ECECEC]" style={{ color: '#828996' }}>
          <X size={16} />
        </button>
      </div>
      {/* Content */}
      {isExpired ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Clock size={48} className="mb-4" style={{ color: '#828996' }} />
          <h3 className="mb-2" style={{ fontSize: 20, fontWeight: 600, lineHeight: '28px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>Session Expired</h3>
          <p className="mb-6" style={{ fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>This view has expired. Please run the task again for fresh data.</p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full text-white"
            style={{ background: '#386AF6', fontSize: 16, fontWeight: 600, lineHeight: '20px', letterSpacing: '0.1px', fontFamily: 'Montserrat, sans-serif' }}
          >Back to Chat</button>
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ fontFamily: DS.font }}
          dangerouslySetInnerHTML={{ __html: card.fullHtml || card.html || '' }}
        />
      )}
      </div>
    </>
  )
}

function MessageBubble({ msg, onChipClick, onAction, onCardClick }) {
  const isUser = msg.role === 'user'
  const ACTION_COLORS = {
    ok:   'border-[#00BA34] text-[#007B22] active:bg-[#00BA34]',
    err:  'border-[#EB5757] text-[#C0392B] active:bg-[#EB5757]',
    warn: 'border-[#F8B200] text-[#9A6500] active:bg-[#F8B200]',
    primary: 'border-[#386AF6] text-[#386AF6] active:bg-[#386AF6]',
  }
  const hasWide = msg.html || msg.card

  // Body/Medium typography per design system: 14px Regular, 20px line-height, +0.25 letter-spacing
  const bodyMedium = { fontSize: 14, lineHeight: '20px', letterSpacing: '0.25px', fontFamily: 'Montserrat, sans-serif' }

  // Chat bubble mixed-radius patterns from design system
  // User: tl=lg, tr=lg, br=xs, bl=lg → 12 12 2 12
  // Bot:  tl=lg, tr=lg, br=lg, bl=xs → 12 12 12 2
  const userRadius = '12px 12px 2px 12px'
  const botRadius  = '12px 12px 12px 2px'

  return (
    <div className={`flex gap-2 mb-2 ${isUser ? 'flex-row-reverse' : 'items-end'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#386AF6] flex items-center justify-center text-white font-bold text-[12px] flex-shrink-0 self-end">V</div>
      )}
      <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'} ${hasWide ? 'flex-1 max-w-[92%] md:max-w-[82%]' : 'max-w-[75%]'}`}>
        {/* Text bubble */}
        {msg.text && (
          <div className="px-3 py-3 whitespace-pre-line max-w-full"
            style={{
              ...bodyMedium,
              background: isUser ? '#386AF6' : '#ECECEC',
              color: isUser ? '#FFFFFF' : '#0E0E0E',
              borderRadius: isUser ? userRadius : botRadius,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}>
            {msg.text}
          </div>
        )}
        {/* Expandable card bubble (click to open webview) */}
        {msg.card && (
          <div
            onClick={() => onCardClick?.(msg.card)}
            className="mt-2 bg-white border border-[#D5D8DF] overflow-hidden cursor-pointer hover:shadow-md transition-shadow w-full"
            style={{ maxWidth: 380, borderRadius: 12 }}
          >
            {msg.card.preview && (
              <div className="px-4 pt-3 pb-1" dangerouslySetInnerHTML={{ __html: msg.card.preview }} />
            )}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-[#ECECEC]">
              <span className="text-[18px]">{msg.card.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[#0E0E0E]" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.2px', lineHeight: '20px' }}>{msg.card.title}</div>
                {msg.card.subtitle && <div className="text-[11px] font-medium text-[#828996]" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2px', lineHeight: '14px', marginTop: 2 }}>{msg.card.subtitle}</div>}
              </div>
              <div className="flex items-center gap-1 text-[#386AF6] text-[12px] font-semibold flex-shrink-0" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                <Eye size={14} /> Open
              </div>
            </div>
          </div>
        )}
        {/* Inline HTML card */}
        {msg.html && (
          <div className="mt-1.5 bg-white border border-[#D5D8DF] px-3 sm:px-4 py-3 text-[#0E0E0E] w-full max-w-full overflow-hidden"
            style={{ borderRadius: 12, minWidth: 0, boxSizing: 'border-box' }}
            dangerouslySetInnerHTML={{ __html: msg.html }} />
        )}
        {/* Action buttons */}
        {msg.actions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 w-full max-w-full">
            {msg.actions.map((a, i) => (
              <button key={i}
                onClick={() => onAction ? onAction(a) : onChipClick(a.trigger)}
                className={`px-4 py-1.5 rounded-full border-[1.5px] text-[12px] font-semibold bg-white transition-colors active:text-white whitespace-normal text-left max-w-full ${ACTION_COLORS[a.variant] || ACTION_COLORS.primary}`}
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >{a.label}</button>
            ))}
          </div>
        )}
        {/* Chip options */}
        {msg.opts?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 w-full max-w-full">
            {msg.opts.map((opt, i) => (
              <button key={i} onClick={() => onChipClick(opt)}
                className="px-4 py-1.5 rounded-full border-[1.5px] border-[#386AF6] text-[12px] font-medium text-[#386AF6] bg-white hover:bg-[#EEF2FF] transition-colors whitespace-normal text-left max-w-full"
                style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.25px', overflowWrap: 'anywhere', wordBreak: 'break-word' }}
              >{opt}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Personalized stats per role
function getRoleAlerts(role, profile) {
  // Single source of truth for the At-Risk count. Same function the
  // AtRiskStudentsCanvas uses — so the home tile number always matches the
  // canvas total (was 3 vs 18 mismatch before).
  const cohort = getAtRiskCohort(role, profile, {})
  const risk = cohort.atRisk.total
  const pending = NAMO_LAXMI_APPS?.filter(a => a.status === 'pending')?.length || 0
  if (role === 'teacher') {
    // Pin every teacher-scope drilldown to the teacher's primary class so the
    // home tile counts always agree with the canvas. Falls back to grade 8
    // for legacy profiles without a `classes` array.
    const teacherGrade = profile?.classes?.[0] || 8
    return [
      { icon: '👥', label: 'Students', value: `${STUDENTS[teacherGrade]?.length || 30}`, color: '#386AF6',
        canvas: { type: 'student-roster', grade: teacherGrade, classLabel: `Class ${teacherGrade}` } },
      { icon: '⚠️', label: 'At Risk', value: `${risk}`, color: '#DC2626',
        canvas: { type: 'at-risk-students', grade: teacherGrade } },
      { icon: '📋', label: 'DigiVritti Pending', value: `${pending}`, color: '#D97706',
        trigger: 'dv:canvas:list:pending' },
      { icon: '📊', label: 'Avg Score', value: `${PERF_DATA[teacherGrade]?.math || 74}%`, color: '#16A34A',
        canvas: { type: 'class-report', grade: teacherGrade, classLabel: `Class ${teacherGrade}` } },
    ]
  }
  if (role === 'principal') return [
    { icon: '🏫', label: 'Total Students', value: '342', color: '#386AF6',
      canvas: { type: 'student-roster', scope: 'school', classLabel: 'Whole school' } },
    { icon: '👩‍🏫', label: 'Teachers', value: '18', color: '#0EA5E9',
      canvas: { type: 'registry', kind: 'teachers', scope: 'school',
                district: profile?.district || 'Mehsana',
                schoolName: profile?.school || 'Sardar Patel Prathmik Shala',
                teacherCount: 18, studentCount: 342 } },
    { icon: '📅', label: 'Teacher Att.', value: '17/18', color: '#16A34A',
      canvas: { type: 'teacher-attendance' } },
    { icon: '⚠️', label: 'At-risk', value: `${risk}`, color: '#DC2626',
      canvas: { type: 'at-risk-students', grade: 8 } },
  ]
  if (role === 'deo') {
    const district = profile?.district || 'Ahmedabad'
    const agg = aggregatesFor('district', district) || {}
    // For DEO scope (~4K schools, ~41K teachers per Ahmedabad master), show
    // the actual aggregate on the tile. The registry canvas shows the first
    // N (synth-capped) with a sampling banner — that gap is documented in
    // the canvas itself, not hidden by clamping the tile.
    return [
      { icon: '🏫', label: 'Schools', value: (agg.schools || 0).toLocaleString(), color: '#386AF6',
        canvas: { type: 'registry', kind: 'schools', scope: 'district', district } },
      { icon: '👩‍🏫', label: 'Teachers', value: agg.teachers ? `${(agg.teachers/1000).toFixed(1)}K` : '—', color: '#7C3AED',
        canvas: { type: 'registry', kind: 'teachers', scope: 'district', district } },
      { icon: '🧭', label: 'Blocks', value: String(agg.blocks || '—'), color: '#0EA5E9',
        canvas: { type: 'attendance-dashboard', scope: 'district', district } },
      { icon: '👥', label: 'Students', value: agg.students ? `${(agg.students/1e5).toFixed(1)}L` : '—', color: '#059669',
        canvas: { type: 'dashboard', scope: 'district', district } },
      { icon: '⚠️', label: 'At-risk', value: '142', color: '#DC2626',
        canvas: { type: 'at-risk-students', grade: 8 } },
    ]
  }
  if (role === 'state_secretary') return [
    { icon: '🏛️', label: 'Districts', value: String(REGISTRY_AGG.districtCount), color: '#386AF6',
      canvas: { type: 'registry', kind: 'districts' } },
    { icon: '🏫', label: 'Schools', value: `${(REGISTRY_AGG.totalSchools / 1000).toFixed(1)}K`, color: '#7C3AED',
      canvas: { type: 'registry', kind: 'schools' } },
    { icon: '👥', label: 'Students', value: `${(REGISTRY_AGG.totalStudents / 1e6).toFixed(1)}M`, color: '#059669',
      canvas: { type: 'dashboard', scope: 'state' } },
    { icon: '📅', label: 'Avg Att.', value: '85.4%', color: '#16A34A',
      canvas: { type: 'dashboard', scope: 'state' } },
  ]
  // PFMS — payment-side stats only.
  if (role === 'pfms') return [
    { icon: '🏦', label: 'Pending',   value: '12.4K', color: '#D97706',
      canvas: { type: 'digivritti', view: 'payment-queue', status: 'pending' } },
    { icon: '✅', label: 'Disbursed', value: '₹428Cr', color: '#16A34A',
      canvas: { type: 'digivritti', view: 'payment-queue', status: 'success' } },
    { icon: '🔻', label: 'Failed',    value: '65',    color: '#DC2626',
      canvas: { type: 'digivritti', view: 'payment-queue', status: 'failed' } },
    { icon: '📊', label: 'Success%',  value: '94.2%', color: '#386AF6',
      canvas: { type: 'digivritti', view: 'analytics' } },
  ]
  // CRC — cluster approver. Show cluster-scoped registry + approval queue.
  if (role === 'crc') {
    // Fallback to ANAND-6 — that's the cluster with sample data in
    // schools_sample.json (7 schools + 2 teachers).
    const cluster = profile?.cluster || 'ANAND-6'
    // teachersForScope + schoolsForScope are the same functions the registry
    // canvas calls, so tile = canvas list count by construction.
    const schoolCount  = schoolsForScope({ cluster }).length
    const teacherCount = teachersForScope({ cluster }).length
    return [
      { icon: '🏫', label: 'Schools', value: schoolCount.toLocaleString(), color: '#386AF6',
        canvas: { type: 'registry', kind: 'schools', scope: 'cluster', cluster } },
      { icon: '👩‍🏫', label: 'Teachers', value: teacherCount.toLocaleString(), color: '#0EA5E9',
        canvas: { type: 'registry', kind: 'teachers', scope: 'cluster', cluster } },
      { icon: '⏳', label: 'Pending reviews', value: '38', color: '#D97706',
        canvas: { type: 'digivritti', view: 'review' } },
      { icon: '📈', label: 'Approval%', value: '92.9%', color: '#16A34A',
        canvas: { type: 'dashboard', scope: 'cluster' } },
    ]
  }
  // BEO — block education officer. Block-scoped real data.
  if (role === 'beo') {
    // Fallback to ANAND — that's the block with best sample overlap
    // (19 schools + 7 teachers in the registry).
    const block = profile?.block || 'ANAND'
    const agg = aggregatesFor('block', block) || {}
    const schoolCount  = schoolsForScope({ block }).length
    const teacherCount = teachersForScope({ block }).length
    // "Below benchmark" is the count of schools with attendance < 75% in the
    // block — use the same builder the schools-at-risk canvas uses so the
    // tile and the canvas always agree.
    const belowBenchmark = getSchoolCohort('beo', profile, { mode: 'below_attendance_benchmark' }).atRisk.total
    return [
      { icon: '🏫', label: 'Schools', value: schoolCount.toLocaleString(), color: '#386AF6',
        canvas: { type: 'registry', kind: 'schools', scope: 'block', block } },
      { icon: '👩‍🏫', label: 'Teachers', value: teacherCount.toLocaleString(), color: '#0EA5E9',
        canvas: { type: 'registry', kind: 'teachers', scope: 'block', block } },
      { icon: '👥', label: 'Students', value: agg.students ? `${(agg.students/1000).toFixed(1)}K` : '—', color: '#059669',
        canvas: { type: 'dashboard', scope: 'district' } },
      { icon: '⚠️', label: 'Below benchmark', value: String(belowBenchmark),
        color: '#DC2626',
        canvas: { type: 'schools-at-risk', filter: 'schools_below_benchmark' } },
    ]
  }
  // Parent — child-only metrics, no scholarship management.
  return [
    { icon: '📅', label: 'Attendance',  value: '74%',  color: '#D97706',
      canvas: { type: 'attendance', view: 'parent' } },
    { icon: '📊', label: 'Avg Score',   value: '68%',  color: '#386AF6',
      canvas: { type: 'report', view: 'parent_proficiency' } },
    { icon: '📖', label: 'Homework',    value: 'Due',  color: '#7C3AED',
      canvas: { type: 'attendance', view: 'parent' } },
    { icon: '🎓', label: 'Grade',       value: profile?.childGrade || 'Class 8', color: '#16A34A',
      canvas: { type: 'report', view: 'parent_proficiency' } },
  ]
}

function WelcomeScreen({ botName, onChip, role, profile, onOpenCanvas }) {
  const suggestions = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.teacher || []
  const actions = QUICK_ACTIONS[role] || QUICK_ACTIONS.teacher
  const alerts = getRoleAlerts(role, profile)
  const firstName = profile?.name?.split(' ')[0] || 'there'
  const roleLabel = ROLE_META[role]?.badge || 'User'

  // Design system text styles
  const headingMedium  = { fontSize: 24, fontWeight: 600, lineHeight: '32px', fontFamily: 'Montserrat, sans-serif' }
  const titleSmall     = { fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.2px', fontFamily: 'Montserrat, sans-serif' }
  const bodyMedium     = { fontSize: 14, fontWeight: 400, lineHeight: '20px', letterSpacing: '0.25px', fontFamily: 'Montserrat, sans-serif' }
  const labelSmall     = { fontSize: 12, fontWeight: 500, lineHeight: '16px', letterSpacing: '0.25px', fontFamily: 'Montserrat, sans-serif' }
  const caption        = { fontSize: 11, fontWeight: 500, lineHeight: '14px', letterSpacing: '0.2px', fontFamily: 'Montserrat, sans-serif' }
  const captionSmall   = { fontSize: 10, fontWeight: 400, lineHeight: '14px', letterSpacing: '0.2px', fontFamily: 'Montserrat, sans-serif' }

  return (
    // Inherit the scrolling chat area's white surface (#FFFFFF) so the
    // welcome state looks identical to the threaded chat state. Previously
    // this was hard-set to #ECECEC, which is why the "no messages" landing
    // looked grey in production while the chat thread was white.
    <div className="flex-1 flex flex-col items-center px-4 md:px-8 py-8 overflow-y-auto" style={{ background: '#FFFFFF' }}>

      {/* Personalized hero */}
      <div className="w-full max-w-[704px] mb-8 mt-2">
        <div className="flex items-center gap-4 mb-6">
          <img src="https://i.ibb.co/Xr1jqvd4/Logo-VSK-PNG.png" alt="VSK" width={48} height={48}
            style={{ objectFit: 'contain', display: 'block' }} draggable={false} />
          <div>
            <h1 style={{ ...headingMedium, color: '#0E0E0E' }}>
              {TIME_GREET}, {firstName}!
            </h1>
            <p style={{ ...bodyMedium, color: '#7383A5' }}>
              {roleLabel} · {
                // Show the user's actual jurisdiction, not just "VSK Gujarat".
                // DEO: "Ahmedabad district". BEO: "Anand block". CRC:
                // "ANAND-6 cluster". Principal/Teacher: school name.
                role === 'deo' && profile?.district ? `${profile.district} district`
                : role === 'state_secretary' ? 'Gujarat state'
                : role === 'beo' && profile?.block ? `${profile.block} block`
                : role === 'crc' && profile?.cluster ? `${profile.cluster} cluster`
                : (role === 'principal' || role === 'teacher') && profile?.school ? profile.school
                : 'VSK Gujarat'
              }
            </p>
          </div>
        </div>

        {/* Today's stats strip — each tile is clickable. Canvas tiles open the
            matching right-side webview; trigger tiles re-enter the chat
            dispatcher. Pure-display tiles stay as plain divs. */}
        <div className="grid grid-cols-4 gap-3">
          {alerts.map((a, i) => {
            const interactive = !!(a.canvas || a.trigger)
            const onClick = () => {
              if (a.canvas && typeof onOpenCanvas === 'function') {
                onOpenCanvas(a.canvas)
              } else if (a.trigger && typeof onChip === 'function') {
                onChip(a.trigger)
              }
            }
            const Tag = interactive ? 'button' : 'div'
            return (
              <Tag
                key={i}
                onClick={interactive ? onClick : undefined}
                className={`bg-white px-4 py-4 text-center transition-shadow ${
                  interactive ? 'hover:shadow-md hover:border-[#84A2F4] active:scale-[0.98] cursor-pointer' : 'hover:shadow-sm'
                }`}
                style={{ borderRadius: 12, border: '1px solid #D5D8DF' }}
              >
                <div className="text-[18px] mb-1">{a.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: '24px', color: a.color, fontFamily: 'Montserrat, sans-serif' }}>{a.value}</div>
                <div style={{ ...captionSmall, color: '#828996', textTransform: 'uppercase', marginTop: 2 }}>{a.label}</div>
              </Tag>
            )
          })}
        </div>
      </div>

      {/* KPI report card — injected here for roles that have KPIs. Returns
          null for roles with no KPIs (e.g. DEO), so the original WelcomeScreen
          flow is preserved for those. */}
      <ReportCardSection />

      {/* Quick Actions */}
      <div className="w-full max-w-[704px]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} style={{ color: '#386AF6' }} />
          <span style={{ ...titleSmall, color: '#0E0E0E' }}>Quick Actions</span>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {actions.map((item, i) => {
            const Icon = item.icon
            // Quick Actions either open a canvas directly (item.canvas) or
            // fire a chat trigger (item.trigger). Ask AI is a chat trigger —
            // chat opens with prompts; clicking a prompt opens the chart
            // canvas alongside the chat (handled in the home's chat trigger
            // dispatcher).
            const handle = () => {
              if (item.canvas && typeof onOpenCanvas === 'function') {
                onOpenCanvas(item.canvas)
              } else {
                onChip(item.trigger)
              }
            }
            return (
              <button key={i} onClick={handle}
                className="flex flex-col items-center justify-center gap-2 py-4 px-2 active:scale-95 transition-all duration-150 hover:shadow-md"
                style={{ background: item.bg, borderRadius: 12, border: '1px solid #D5D8DF' }}>
                <div className="w-10 h-10 flex items-center justify-center" style={{ background: item.fg + '22', borderRadius: 8 }}>
                  <Icon size={20} color={item.fg} strokeWidth={1.8} />
                </div>
                <span className="text-center whitespace-pre-line"
                  style={{ ...caption, color: '#0E0E0E', fontWeight: 600 }}>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Suggested prompts */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={13} style={{ color: '#828996' }} />
              <span style={{ ...labelSmall, color: '#7383A5' }}>Try asking me...</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.slice(0, 6).map((s, i) => (
                <button key={i} onClick={() => onChip(s)}
                  className="text-left px-4 py-3 bg-white transition-all"
                  style={{
                    ...bodyMedium, color: '#7383A5',
                    borderRadius: 12,
                    border: '1px solid #D5D8DF',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#84A2F4'; e.currentTarget.style.color = '#0E0E0E' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#D5D8DF'; e.currentTarget.style.color = '#7383A5' }}>
                  <span style={{ color: '#386AF6', marginRight: 6, fontWeight: 600 }}>→</span> {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const DESIGN_TOOLS = [
  { id: 'canva',  label: 'Create with Canva',  icon: '🎨', color: '#7B2FF2' },
  { id: 'adobe',  label: 'Create with Adobe',  icon: '🅰️', color: '#E8344E' },
]

function InputBar({ onSend, disabled, activeBot, onAttach, activeTool, onToolSelect }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const fileRef = useRef(null)

  const send = () => {
    const v = text.trim()
    if (!v || disabled) return
    onSend(v, activeTool)
    setText('')
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const autoResize = e => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
    setText(e.target.value)
  }

  // Label/Medium typography per design system: 14px Medium, 20px line-height, +0.1 ls
  const labelMedium = { fontSize: 14, lineHeight: '20px', letterSpacing: '0.1px', fontFamily: 'Montserrat, sans-serif' }
  return (
    <div
      className="px-3 sm:px-4 pt-2 flex-shrink-0"
      style={{
        background: '#ECECEC',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Active tool badge */}
      {activeTool && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[11px] font-medium px-3 py-1 rounded-full text-white"
            style={{ background: DESIGN_TOOLS.find(t=>t.id===activeTool)?.color || '#666', fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.2px' }}>
            {DESIGN_TOOLS.find(t=>t.id===activeTool)?.icon} {DESIGN_TOOLS.find(t=>t.id===activeTool)?.label}
          </span>
          <button onClick={() => onToolSelect?.(null)} className="text-[11px] text-[#828996] hover:text-[#7383A5]" style={{ fontFamily: 'Montserrat, sans-serif' }}>✕ Remove</button>
        </div>
      )}
      <div
        className={`border-[1.5px] transition-all bg-white`}
        style={{
          borderColor: focused ? '#386AF6' : '#D5D8DF',
          borderRadius: 24,
          boxShadow: focused ? '0 0 0 2px rgba(56,106,246,0.15)' : 'none',
        }}
      >
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          onChange={autoResize}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={activeTool ? `Describe what to create with ${activeTool === 'canva' ? 'Canva' : 'Adobe'}...` : `Message ${activeBot || 'VSK Gujarat'}...`}
          className="w-full px-5 pt-3 pb-2 bg-transparent outline-none resize-none placeholder:text-[#828996]"
          style={{ ...labelMedium, color: '#0E0E0E', minHeight: 44, maxHeight: 150 }}
        />
        <div className="flex items-center gap-1.5 px-3 pb-2.5">
          {/* Attachment */}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center w-8 h-8 rounded-full text-[#7383A5] hover:bg-[#ECECEC] transition-colors"
            title="Attach file"
          >
            <Plus size={16} />
          </button>
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden"
            onChange={e => { if (e.target.files?.[0]) onAttach?.(e.target.files[0]); e.target.value = '' }} />

          {/* Tools dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTools(v => !v)}
              className="flex items-center gap-1 h-8 px-3 rounded-full text-[#7383A5] hover:bg-[#ECECEC] transition-colors text-[12px] font-medium"
              style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.25px' }}
            >
              <span style={{ fontSize: 14 }}>🛠️</span> Tools
            </button>
            {showTools && (
              <div className="absolute bottom-full left-0 mb-1 bg-white border border-[#D5D8DF] shadow-lg z-20 min-w-[200px] py-1 animate-fade-in" style={{ borderRadius: 12 }}>
                <div className="px-3 py-1.5 text-[10px] font-medium text-[#828996] tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.5px' }}>DESIGN TOOLS</div>
                {DESIGN_TOOLS.map(t => (
                  <button key={t.id}
                    onClick={() => { onToolSelect?.(t.id); setShowTools(false) }}
                    className={`w-full text-left px-3 py-2.5 text-[14px] flex items-center gap-2.5 hover:bg-[#ECECEC] transition-colors ${activeTool === t.id ? 'bg-[#EEF2FF]' : ''}`}
                    style={{ ...labelMedium }}
                  >
                    <span className="text-[16px]">{t.icon}</span>
                    <span className="font-medium" style={{ color: '#0E0E0E' }}>{t.label}</span>
                    {activeTool === t.id && <span className="ml-auto text-[#386AF6] text-[12px]">✓</span>}
                  </button>
                ))}
                <div className="border-t border-[#ECECEC] mt-1 pt-1">
                  <div className="px-3 py-1.5 text-[10px] font-medium text-[#828996] tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.5px' }}>UPLOAD</div>
                  <button
                    onClick={() => { fileRef.current?.click(); setShowTools(false) }}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-[#ECECEC]"
                    style={{ ...labelMedium }}
                  >
                    <FileUp size={16} className="text-[#7383A5]" />
                    <span className="font-medium" style={{ color: '#0E0E0E' }}>Upload Image / PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />
          <button
            onClick={send}
            disabled={!text.trim() || disabled}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: text.trim() ? '#386AF6' : '#C3D2FC' }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ArtifactPanel({ artifact, onClose }) {
  if (!artifact) return null
  const titleSmall = { fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.2px', fontFamily: 'Montserrat, sans-serif' }
  return (
    <div className="flex flex-col h-full border-l bg-white" style={{ minWidth: 0, borderLeftColor: '#D5D8DF' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0" style={{ borderBottomColor: '#D5D8DF' }}>
        <span className="text-[18px]">{artifact.icon}</span>
        <span className="flex-1 truncate" style={{ ...titleSmall, color: '#0E0E0E' }}>{artifact.title}</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] hover:bg-[#ECECEC] transition-colors"
          style={{ fontSize: 12, fontWeight: 500, lineHeight: '16px', letterSpacing: '0.25px', borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Upload size={13} /> Share
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px] hover:bg-[#ECECEC] transition-colors"
          style={{ fontSize: 12, fontWeight: 500, lineHeight: '16px', letterSpacing: '0.25px', borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Download size={13} /> Download
        </button>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ECECEC] transition-colors" style={{ color: '#828996' }}>
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4" dangerouslySetInnerHTML={{ __html: artifact.html }} />
    </div>
  )
}

function ArtifactModal({ artifact, onClose }) {
  if (!artifact) return null
  const titleSmall = { fontSize: 14, fontWeight: 600, lineHeight: '20px', letterSpacing: '-0.2px', fontFamily: 'Montserrat, sans-serif' }
  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col animate-slide-in">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b flex-shrink-0" style={{ borderBottomColor: '#D5D8DF' }}>
        <span className="text-[18px]">{artifact.icon}</span>
        <span className="flex-1 truncate" style={{ ...titleSmall, color: '#0E0E0E' }}>{artifact.title}</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px]"
          style={{ fontSize: 12, fontWeight: 500, borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Upload size={13} /> Share
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[1.5px]"
          style={{ fontSize: 12, fontWeight: 500, borderColor: '#D5D8DF', color: '#7383A5', fontFamily: 'Montserrat, sans-serif' }}>
          <Download size={13} /> Download
        </button>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#ECECEC]" style={{ color: '#828996' }}>
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4" dangerouslySetInnerHTML={{ __html: artifact.html }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SuperHomePage() {
  const {
    role, userProfile, switchRole, openCanvas,
    chats: userChats, activeChatId, activeChat,
    createChat, switchChat, setChatMessages, deleteChat, renameChat,
    consumeChatTrigger, chatTriggerTick,
    openNotificationsCanvas, markAllNotificationsRead,
    navigate, signOut,
  } = useApp()
  const bots = ROLE_BOTS[role] || ROLE_BOTS.teacher || ['VSK Gujarat']
  const [activeBot, setActiveBot]   = useState(bots[0])
  const [messages, setMessages]     = useState([])
  const [typing, setTyping]         = useState(false)
  const [collectState, setCollect]  = useState(null)
  const [artifact, setArtifact]     = useState(null)
  const [activeSession, setSession] = useState('VSK Gujarat Demo Session')
  const [sidebarOpen, setSidebar]   = useState(false)
  const [progressSteps, setProgress] = useState(null) // streaming progress text
  const [webviewCard, setWebview]    = useState(null)  // opened card for webview
  const [activeTool, setActiveTool]  = useState(null)  // 'canva' | 'adobe' | null
  const bottomRef = useRef(null)
  // Track which chat the local `messages` array currently mirrors. Prevents
  // the persist effect from writing the previous chat's messages into a
  // freshly switched chat during the brief window between activeChatId
  // changing and the hydrate effect resetting `messages`.
  const hydratedFor = useRef(null)
  const persistTimer = useRef(null)
  // NLP layer — pending clarify/confirm step that survives across messages.
  const pendingNlp = useRef(null)
  // Ask AI — set of prompt IDs already revealed in the current Ask AI
  // session. Reset whenever the user re-opens Ask AI or switches chats.
  const askAiShownPrompts = useRef(new Set())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // Reset active bot when role changes
  useEffect(() => {
    const newBots = ROLE_BOTS[role] || ['VSK Gujarat']
    setActiveBot(newBots[0])
  }, [role])

  // Hydrate local `messages` from the active chat whenever it changes
  // (login, sidebar click, "New chat", etc.).
  useEffect(() => {
    if (!activeChatId) {
      setMessages([])
      hydratedFor.current = null
      return
    }
    // Skip when handleSend has already pre-hydrated this chat. handleSend's
    // lazy chat creation sets hydratedFor.current = newId BEFORE state
    // commits — without this guard, the effect would fire on the
    // null → newId transition and clobber the user bubble + bot reply that
    // were just appended in the same React batch.
    if (hydratedFor.current === activeChatId) return
    // Read fresh from localStorage rather than the closed-over `activeChat`
    // memo, since this effect must fire as soon as the id flips.
    const persisted = (userChats || []).find(c => c.id === activeChatId)
    setMessages(persisted?.messages || [])
    setCollect(null); setArtifact(null); setActiveTool(null)
    askAiShownPrompts.current = new Set()
    hydratedFor.current = activeChatId
    // We DO NOT depend on userChats — that would re-hydrate every save tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId])

  // Persist local `messages` back to the active chat (debounced 250 ms).
  // Auto-title from the first user message if the chat is still untitled.
  useEffect(() => {
    if (!activeChatId) return
    if (hydratedFor.current !== activeChatId) return  // skip until hydrated
    clearTimeout(persistTimer.current)
    persistTimer.current = setTimeout(() => {
      setChatMessages(activeChatId, messages)
      const cur = (userChats || []).find(c => c.id === activeChatId)
      if (cur && cur.title === 'New chat') {
        const firstUser = messages.find(m => m.role === 'user' && m.text)
        if (firstUser) renameChat(activeChatId, firstUser.text.slice(0, 40))
      }
    }, 250)
    return () => clearTimeout(persistTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeChatId])

  // Window globals for interactive inline cards
  useEffect(() => {
    window._vskToggle = (el) => {
      const isP = el.dataset.status === 'present'
      el.dataset.status = isP ? 'absent' : 'present'
      el.style.background = isP ? DS.errorSubtle : DS.successSubtle
      el.style.borderColor = isP ? DS.error : DS.success
      el.style.color = isP ? DS.errorText : DS.successText
      el.textContent = (isP ? '✗ ' : '✓ ') + el.dataset.n
      // Update summary
      const grid = el.closest('[id]')?.parentElement
      if (!grid) return
      const all = grid.querySelectorAll('[data-status]')
      const absent = [...all].filter(e => e.dataset.status === 'absent').length
      const summary = grid.querySelector('#att-summary')
      if (summary) summary.innerHTML = `Present: <strong style="color:${DS.successText};font-weight:600">${all.length - absent}</strong> · Absent: <strong style="color:${DS.errorText};font-weight:600">${absent}</strong>`
    }
    window._vskSubmit = (btn) => {
      btn.textContent = '✅ Submitted'
      btn.style.background = DS.success
      btn.style.borderColor = DS.success
      btn.style.color = DS.textInverse
      btn.style.pointerEvents = 'none'
    }
    window._vskToggleNL = (idx) => {
      const detail = document.getElementById(`nl-detail-${idx}`)
      const arrow = document.getElementById(`nl-arrow-${idx}`)
      if (detail) {
        const isOpen = detail.style.display !== 'none'
        detail.style.display = isOpen ? 'none' : 'block'
        if (arrow) arrow.textContent = isOpen ? '▼' : '▲'
      }
    }
    window._vskNLAction = (action, idx) => {
      const apps = NAMO_LAXMI_APPS || []
      const app = apps[idx]
      if (!app) return
      if (action === 'resubmit') {
        const btn = event?.target
        if (btn) { btn.textContent = '✅ Re-submitted'; btn.style.background = DS.successSubtle; btn.style.color = DS.successText; btn.style.borderColor = DS.success; btn.style.pointerEvents = 'none' }
      } else if (action === 'edit' || action === 'view') {
        // Show a toast-like alert with form details
        const inputStyle = `width:100%;padding:8px 12px;border:1px solid ${DS.borderDefault};border-radius:${DS.radiusFull}px;margin-top:4px;font-size:14px;font-weight:500;letter-spacing:0.1px;font-family:${DS.font};color:${DS.textPrimary};background:${DS.surfaceDefault}`
        const labelStyle = `font-size:11px;font-weight:500;letter-spacing:0.2px;color:${DS.textSecondary};text-transform:uppercase`
        const overlay = document.createElement('div')
        overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="this.remove()">
          <div style="background:${DS.surfaceDefault};border-radius:${DS.radiusXl}px;padding:24px;max-width:440px;width:100%;max-height:80vh;overflow-y:auto;font-family:${DS.font};color:${DS.textPrimary}" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
              <h3 style="font-size:16px;font-weight:700;letter-spacing:0;margin:0;color:${DS.textPrimary}">${action === 'edit' ? '✏️ Edit' : '👁️ View'} — ${app.studentName}</h3>
              <button onclick="this.closest('[style*=fixed]').remove()" style="border:none;background:none;font-size:18px;cursor:pointer;color:${DS.textTertiary};width:32px;height:32px;border-radius:${DS.radiusFull}px">✕</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <label style="${labelStyle}">Student Name<input value="${app.studentName}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">Father's Name<input value="${app.fatherName}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">Mother's Name<input value="${app.motherName}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">Student Aadhaar<input value="${app.studentAadhaar}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">Mother Aadhaar<input value="${app.motherAadhaar}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">Bank Account<input value="${app.bankAcc}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <label style="${labelStyle}">IFSC Code<input value="${app.ifsc}" style="${inputStyle}" ${action==='view'?'disabled':''}></label>
              <div style="${labelStyle};margin-top:4px">Documents</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${['Aadhaar','PAN Card','Income Cert','LC','Passbook'].map((d,di) => {
                  const key = ['aadhaar','pan','income','lc','passbook'][di]
                  return `<span style="padding:4px 10px;border-radius:${DS.radiusFull}px;font-size:11px;font-weight:500;letter-spacing:0.2px;background:${app.docs?.[key]?DS.successSubtle:DS.errorSubtle};color:${app.docs?.[key]?DS.successText:DS.errorText}">${app.docs?.[key]?'✅':'❌'} ${d}</span>`
                }).join('')}
              </div>
              ${app.reason ? `<div style="background:${DS.errorSubtle};color:${DS.errorText};padding:12px;border-radius:${DS.radiusMd}px;font-size:12px;font-weight:500;letter-spacing:0.25px;margin-top:4px">⚠️ Rejection reason: ${app.reason}</div>` : ''}
              ${action === 'edit' ? `<button onclick="this.textContent='✅ Saved!';this.style.background='${DS.success}';setTimeout(()=>this.closest('[style*=fixed]').remove(),800)" style="width:100%;padding:14px;background:${DS.brand};color:${DS.textInverse};border:none;border-radius:${DS.radiusFull}px;font-size:16px;font-weight:600;letter-spacing:0.1px;cursor:pointer;margin-top:8px;font-family:${DS.font}">💾 Save Changes</button>` : ''}
            </div>
          </div>
        </div>`
        document.body.appendChild(overlay)
      }
    }
    // ── Design tool globals ──────────────────────────────────────────
    window._vskEditMode = () => {
      const btn = document.getElementById('edit-toggle')
      const editables = document.querySelectorAll('.ce')
      const isEditing = btn?.dataset.editing === 'true'
      editables.forEach(el => { el.contentEditable = isEditing ? 'false' : 'true'; el.style.outline = isEditing ? 'none' : '2px dashed #386AF6'; el.style.outlineOffset = '2px'; el.style.borderRadius = '4px' })
      if (btn) { btn.dataset.editing = isEditing ? 'false' : 'true'; btn.textContent = isEditing ? '✏️ Edit Text' : '✅ Done Editing'; btn.style.background = isEditing ? 'white' : '#EEF3FF'; btn.style.borderColor = isEditing ? '#E2E8F0' : '#386AF6'; btn.style.color = isEditing ? '#374151' : '#386AF6' }
    }
    window._vskTheme = (c1, c2) => {
      const hero = document.getElementById('hero-grad')
      if (hero) hero.style.background = `linear-gradient(135deg,${c1},${c2})`
      // Update numbered circles
      document.querySelectorAll('#design-content [style*="border-radius: 50%"]').forEach(el => {
        if (el.style.background?.includes('linear-gradient') || el.style.background === c1) el.style.background = `linear-gradient(135deg,${c1},${c2})`
      })
    }
    window._vskDownloadPdf = () => {
      const content = document.getElementById('design-content')
      if (!content) return
      const toolbar = document.getElementById('design-toolbar')
      if (toolbar) toolbar.style.display = 'none'
      const printWin = window.open('', '_blank', 'width=800,height=1100')
      printWin.document.write(`<!DOCTYPE html><html><head><title>VSK Gujarat — Lesson Plan</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Montserrat,sans-serif;padding:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
          @media print{body{padding:10px}@page{margin:12mm}}
        </style>
      </head><body>${content.innerHTML}</body></html>`)
      printWin.document.close()
      setTimeout(() => { printWin.print(); if (toolbar) toolbar.style.display = 'flex' }, 500)
    }

    window._vskXamtaFile = (input) => {
      const file = input?.files?.[0]
      if (!file) return

      // Read file as data URL for image preview
      const isImage = file.type?.startsWith('image') || file.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      const reader = new FileReader()

      const showScanner = (imgSrc) => {
        const overlay = document.createElement('div')
        overlay.id = 'xamta-scan-overlay'
        const style = document.createElement('style')
        style.textContent = `
          @keyframes xamtaScanLine{0%{top:0}50%{top:calc(100% - 4px)}100%{top:0}}
          @keyframes xamtaPulseGlow{0%,100%{box-shadow:0 0 20px rgba(56,106,246,0.3)}50%{box-shadow:0 0 60px rgba(56,106,246,0.8),0 0 120px rgba(56,106,246,0.3)}}
          @keyframes xamtaFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
          @keyframes xamtaProgress{0%{width:0}100%{width:100%}}
          @keyframes xamtaCorner{0%,100%{opacity:0.5}50%{opacity:1}}
          @keyframes xamtaSuccess{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}
        `
        document.head.appendChild(style)

        overlay.innerHTML = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Montserrat,sans-serif;animation:xamtaFadeIn 0.3s ease">
          <!-- Header -->
          <div style="color:white;text-align:center;margin-bottom:20px">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#60A5FA;margin-bottom:4px">XAMTA SCANNER</div>
            <div id="xamta-status" style="font-size:15px;font-weight:700;color:white">Initializing scan...</div>
          </div>

          <!-- Image container with scan effect -->
          <div style="position:relative;width:min(80vw,360px);height:min(60vw,280px);border-radius:12px;overflow:hidden;animation:xamtaPulseGlow 2s ease infinite">
            ${imgSrc
              ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.7)" />`
              : `<div style="width:100%;height:100%;background:#1a1a2e;display:flex;align-items:center;justify-content:center">
                  <div style="font-size:48px">📄</div>
                </div>`}

            <!-- Blue scanning line (MRI style) -->
            <div id="xamta-scanline" style="position:absolute;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent 0%,rgba(56,106,246,0.3) 20%,#386AF6 50%,rgba(56,106,246,0.3) 80%,transparent 100%);box-shadow:0 0 20px #386AF6,0 0 60px rgba(56,106,246,0.5);top:0;animation:xamtaScanLine 2.5s ease-in-out infinite;z-index:2"></div>

            <!-- Blue tint overlay -->
            <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(56,106,246,0.08) 0%,rgba(56,106,246,0.15) 50%,rgba(56,106,246,0.08) 100%);z-index:1"></div>

            <!-- Corner brackets -->
            <div style="position:absolute;top:8px;left:8px;width:24px;height:24px;border-top:3px solid #60A5FA;border-left:3px solid #60A5FA;z-index:3;animation:xamtaCorner 1.5s ease infinite"></div>
            <div style="position:absolute;top:8px;right:8px;width:24px;height:24px;border-top:3px solid #60A5FA;border-right:3px solid #60A5FA;z-index:3;animation:xamtaCorner 1.5s ease 0.2s infinite"></div>
            <div style="position:absolute;bottom:8px;left:8px;width:24px;height:24px;border-bottom:3px solid #60A5FA;border-left:3px solid #60A5FA;z-index:3;animation:xamtaCorner 1.5s ease 0.4s infinite"></div>
            <div style="position:absolute;bottom:8px;right:8px;width:24px;height:24px;border-bottom:3px solid #60A5FA;border-right:3px solid #60A5FA;z-index:3;animation:xamtaCorner 1.5s ease 0.6s infinite"></div>

            <!-- Grid overlay -->
            <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(56,106,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(56,106,246,0.06) 1px,transparent 1px);background-size:20px 20px;z-index:1"></div>
          </div>

          <!-- Progress section -->
          <div style="width:min(80vw,360px);margin-top:20px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span id="xamta-step" style="font-size:11px;color:#93C5FD;font-weight:600">Detecting answer sheet...</span>
              <span id="xamta-pct" style="font-size:11px;color:#60A5FA;font-weight:700">0%</span>
            </div>
            <div style="width:100%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden">
              <div id="xamta-bar" style="width:0;height:100%;background:linear-gradient(90deg,#386AF6,#60A5FA);border-radius:3px;transition:width 0.3s ease"></div>
            </div>
            <div id="xamta-details" style="margin-top:12px;font-size:10px;color:rgba(255,255,255,0.4);text-align:center">
              File: ${file.name || 'camera_capture.jpg'} · Processing with XAMTA AI Engine
            </div>
          </div>

          <!-- Success state (hidden initially) -->
          <div id="xamta-success" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,0.9);z-index:10;flex-direction:column;align-items:center;justify-content:center;animation:xamtaSuccess 0.4s ease">
            <div style="width:72px;height:72px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 0 40px rgba(22,163,106,0.5)">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <div style="font-size:18px;font-weight:800;color:white;margin-bottom:6px">Scan Complete!</div>
            <div style="font-size:13px;color:#86EFAC;font-weight:600;margin-bottom:4px">Data Captured Successfully</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5)">3 answer sheets · 75 responses detected</div>
            <div style="display:flex;gap:8px;margin-top:20px">
              <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 14px;text-align:center">
                <div style="font-size:16px;font-weight:800;color:#60A5FA">3</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.5)">Sheets</div>
              </div>
              <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 14px;text-align:center">
                <div style="font-size:16px;font-weight:800;color:#86EFAC">75</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.5)">Responses</div>
              </div>
              <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:8px 14px;text-align:center">
                <div style="font-size:16px;font-weight:800;color:#FCD34D">92%</div>
                <div style="font-size:9px;color:rgba(255,255,255,0.5)">Accuracy</div>
              </div>
            </div>
          </div>
        </div>`

        document.body.appendChild(overlay)

        // Animate progress steps
        const steps = [
          [15, 'Detecting answer sheet layout...'],
          [30, 'Identifying student information...'],
          [50, 'Reading answer bubbles...'],
          [70, 'Matching with answer key...'],
          [85, 'Calculating LO scores...'],
          [100, 'Finalizing results...'],
        ]
        let stepIdx = 0
        const progressIv = setInterval(() => {
          if (stepIdx >= steps.length) { clearInterval(progressIv); return }
          const [pct, label] = steps[stepIdx]
          const bar = document.getElementById('xamta-bar')
          const step = document.getElementById('xamta-step')
          const pctEl = document.getElementById('xamta-pct')
          const status = document.getElementById('xamta-status')
          if (bar) bar.style.width = pct + '%'
          if (step) step.textContent = label
          if (pctEl) pctEl.textContent = pct + '%'
          if (status) status.textContent = pct < 100 ? 'Scanning in progress...' : 'Processing complete'
          stepIdx++
        }, 600)

        // Show success after scan completes, then close
        setTimeout(() => {
          clearInterval(progressIv)
          const scanline = document.getElementById('xamta-scanline')
          if (scanline) scanline.style.display = 'none'
          const success = document.getElementById('xamta-success')
          if (success) success.style.display = 'flex'
        }, 4000)

        setTimeout(() => {
          overlay.remove()
          style.remove()
        }, 6500)
      }

      if (isImage && file instanceof File) {
        reader.onload = (e) => showScanner(e.target.result)
        reader.readAsDataURL(file)
      } else {
        showScanner(null)
      }
    }
    window._vskXamtaScan = () => {
      window._vskXamtaFile?.({ files: [{ name: 'camera_capture.jpg', type: 'image/jpeg' }] })
    }
    return () => {
      delete window._vskToggle; delete window._vskSubmit
      delete window._vskToggleNL; delete window._vskNLAction
      delete window._vskEditMode; delete window._vskTheme; delete window._vskDownloadPdf
      delete window._vskXamtaFile; delete window._vskXamtaScan
    }
  }, [])

  const addBot = useCallback((text, opts = [], { html, actions, card, progress } = {}) => {
    const msg = { id: Date.now(), role:'bot', text, opts, html: html||null, actions: actions||null, card: card||null }
    if (progress?.length) {
      // Show streaming progress text, then deliver message
      setProgress(progress)
      const totalDelay = progress.length * 1100
      setTimeout(() => {
        setProgress(null)
        setMessages(prev => [...prev, msg])
      }, totalDelay)
    } else {
      setTyping(true)
      const delay = Math.min(250 + (text||'').length * 2, 800) + Math.random() * 200
      setTimeout(() => {
        setTyping(false)
        setMessages(prev => [...prev, msg])
      }, delay)
    }
  }, [])

  const openArtifact = useCallback((af) => setArtifact(af), [])

  // ── Notification action plumbing ─────────────────────────────────────────
  // Notification actions that need a chat trigger (e.g. "open DigiVritti home")
  // queue the trigger string in AppContext. We drain that queue here so the
  // trigger flows through the same handleSend path as a real user message.
  useEffect(() => {
    if (typeof consumeChatTrigger !== 'function') return
    let next = consumeChatTrigger()
    while (next) {
      // eslint-disable-next-line no-use-before-define
      handleSendRef.current?.(next, { silent: true })
      next = consumeChatTrigger()
    }
    // chatTriggerTick is the explicit dependency — every queue push bumps it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTriggerTick])

  const handleSendRef = useRef(null)

  const handleSend = useCallback((text, opts = {}) => {
    // `silent` suppresses the user-bubble push — used by the NLP re-entry so
    // we don't echo the synthetic "Task: …" / "dv:…" trigger to the user.
    const { silent = false } = opts
    // ── Lazy chat creation — if the user fires off an action before any
    // chat exists, spin one up so messages have somewhere to persist.
    // We mark hydratedFor so the persist effect knows it can write straight
    // away rather than waiting for a follow-up render.
    if (!activeChatId && role) {
      const tool = detectTool(text)
      const title = tool
        ? TOOL_TITLES[tool]
        : (text && text.length < 40 ? text : 'New chat')
      const created = createChat({ title, tool: tool || null })
      if (created?.id) hydratedFor.current = created.id
    }

    // ── Ask AI — global action-based AI assistant. Intercepted before any
    // other handler so synthetic ask_ai:* triggers stay out of the user
    // bubble area and the deterministic responses never leak into Groq.
    if (isAskAiActionTrigger(text)) {
      const action = decodeAskAiActionTrigger(text)
      if (action) {
        runAskAiAction(action, {
          openCanvas: (ctx) => openCanvas({ ...(ctx || {}), role }),
          runChatTrigger: (t) => setTimeout(() => handleSend(t, { silent: true }), 0),
          openNotificationsCanvas,
        })
      }
      return
    }
    if (isAskAiOpenTrigger(text)) {
      // New Ask AI session — reset the shown-prompt tracker so the
      // progressive reveal starts at the initial chip pool.
      askAiShownPrompts.current = new Set()
      const greet = buildAskAiGreeting(role, userProfile)
      ;(greet.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
      if (greet.userBubble && !silent) {
        setMessages(prev => [...prev, { id: Date.now(), role:'user', text: greet.userBubble, opts:[] }])
      }
      addBot(greet.text || '', greet.opts || [], {
        html: greet.html,
        actions: greet.actions,
      })
      return
    }
    if (isAskAiMorePromptsTrigger(text)) {
      if (!silent) {
        setMessages(prev => [...prev, { id: Date.now(), role:'user', text, opts:[] }])
      }
      const next = buildAskAiNextChips(role, askAiShownPrompts.current)
      ;(next.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
      addBot(next.text || '', next.opts || [], { html: next.html, actions: next.actions })
      return
    }
    if (isAskAiFewerPromptsTrigger(text)) {
      // Collapse the chip stream back to the initial set.
      if (!silent) {
        setMessages(prev => [...prev, { id: Date.now(), role:'user', text, opts:[] }])
      }
      askAiShownPrompts.current = new Set()
      const greet = buildAskAiGreeting(role, userProfile)
      ;(greet.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
      addBot('Showing the starter prompts again. Tap one or type your own question.', greet.opts || [])
      return
    }
    if (isAskAiRunTrigger(text)) {
      const promptId = decodeAskAiRunTrigger(text)
      const directive = runAskAiPrompt(promptId, { role, alreadyEchoedUser: silent })
      if (directive) {
        if (directive.userBubble && !silent) {
          setMessages(prev => [...prev, { id: Date.now(), role:'user', text: directive.userBubble, opts:[] }])
        }
        addBot(directive.text || '', directive.opts || [], {
          html: directive.html,
          actions: directive.actions,
          progress: directive.progress,
        })
        // Open the chart canvas ONLY when the underlying answer is a real
        // visualization (chart / table / kpi_grid). For plain text-only
        // "info" cards there is nothing to show on a dashboard, so the
        // chat-side response is enough — duplicating it into the canvas
        // just looks redundant.
        if (directive.userBubble) {
          let isVisual = false
          try {
            const { card } = answerAskAiChart(directive.userBubble) || {}
            isVisual = !!card && card.type !== 'info'
          } catch { /* if engine throws, default to chat-only */ }
          if (isVisual) {
            openCanvas({ type: 'ask_ai', prompt: directive.userBubble, role })
          }
        }
        return
      }
    }

    // Free-form Ask AI matching — only kicks in for user-typed text (not
    // synthetic triggers) and only when the closest prompt scores high enough.
    if (!silent && !text.toLowerCase().startsWith('task:') && !text.toLowerCase().startsWith('dv:')) {
      const askAiResult = processAskAiQuery(text, { role })
      if (askAiResult) {
        // Push the user message first so the chat reads naturally.
        setMessages(prev => [...prev, { id: Date.now(), role:'user', text, opts:[] }])
        if (askAiResult.kind === 'greeting') {
          askAiShownPrompts.current = new Set()
          const greet = buildAskAiGreeting(role, userProfile)
          ;(greet.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
          addBot(greet.text || '', greet.opts || [], { html: greet.html })
          return
        }
        if (askAiResult.kind === 'more-prompts') {
          const next = buildAskAiNextChips(role, askAiShownPrompts.current)
          ;(next.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
          addBot(next.text || '', next.opts || [], { html: next.html })
          return
        }
        if (askAiResult.kind === 'fewer-prompts') {
          askAiShownPrompts.current = new Set()
          const greet = buildAskAiGreeting(role, userProfile)
          ;(greet.promptIds || []).forEach(id => askAiShownPrompts.current.add(id))
          addBot('Showing the starter prompts again. Tap one or type your own question.', greet.opts || [])
          return
        }
        if (askAiResult.kind === 'inline') {
          addBot(askAiResult.directive.text || '', askAiResult.directive.opts || [])
          return
        }
        if (askAiResult.kind === 'prompt') {
          const directive = runAskAiPrompt(askAiResult.promptId, { role, alreadyEchoedUser: true })
          if (directive) {
            addBot(directive.text || '', directive.opts || [], {
              html: directive.html,
              actions: directive.actions,
              progress: directive.progress,
            })
            // Mirror prompt-click behaviour, but only open the canvas
            // when the answer is a visualization (chart / table / kpi).
            // Info-only cards stay in chat — no point opening an empty
            // dashboard for a text bullet list.
            const seed = directive.userBubble || text
            let isVisual = false
            try {
              const { card } = answerAskAiChart(seed) || {}
              isVisual = !!card && card.type !== 'info'
            } catch { /* default chat-only on engine error */ }
            if (isVisual) {
              openCanvas({ type: 'ask_ai', prompt: seed, role })
            }
            return
          }
        }
      }
    }

    // ── Ask-AI chart fallback ────────────────────────────────────────────
    // If processAskAiQuery didn't match BUT the free text matches one of
    // the chart-able queries in the askAi2 queryEngine (e.g. "Analyze the
    // attendance scenario in the state"), open the Ask AI canvas with the
    // text as seed and post a brief ack to chat. Without this, legacy
    // task-flow triggers (e.g. TASK_FLOWS.attendance which catches the
    // bare word 'attendance') would intercept the query first and start a
    // Mark-Attendance class-selection flow — which is the opposite of what
    // the user is asking for.
    if (!silent && !text.toLowerCase().startsWith('task:') && !text.toLowerCase().startsWith('dv:')) {
      try {
        const { card } = answerAskAiChart(text) || {}
        if (card && card.type !== 'info') {
          setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, opts: [] }])
          addBot('Opening this in your Ask AI canvas →', [], { progress: ['Pulling data…', 'Building chart…'] })
          openCanvas({ type: 'ask_ai', prompt: text, role })
          return
        }
      } catch { /* fall through to existing handlers */ }
    }

    // ── DigiVritti — intercepted before any other handler so the cryptic
    // `dv:*` triggers don't leak into the user bubble area.
    if (isDigiVrittiTrigger(text)) {
      const isInternal = text.toLowerCase().trim().startsWith('dv:')
      if (!isInternal && !silent) {
        setMessages(prev => [...prev, { id: Date.now(), role:'user', text, opts:[] }])
      }
      const result = dispatchDigiVritti(text, role, userProfile)
      if (result) {
        // Some replies (DigiVritti AI) want a user bubble showing the
        // question before the bot answer — synthesize it here.
        if (result.userBubble) {
          setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: result.userBubble, opts: [] }])
        }
        addBot(result.text || '', result.options || [], {
          html: result.html,
          actions: result.actions,
          progress: result.progress,
        })
        // Open the embedded canvas if the dispatcher requested it.
        // The canvas calls back via onComplete to sync results into chat.
        if (result.openCanvas) {
          const schemeName = (s) => s === 'namo_saraswati' ? 'Namo Saraswati' : 'Namo Lakshmi'
          const homeAction = { label: '🏠 DigiVritti home', trigger: 'dv:start', variant: 'primary' }
          const ctx = {
            ...result.openCanvas,
            role,
            onComplete: (ev) => {
              if (!ev) return
              if (ev.kind === 'submit') {
                addBot(
                  `🎉 ${schemeName(ev.scheme)} application submitted for ${ev.studentName}.\nApp ID: ${ev.appId} · Status: APPROVER_PENDING · assigned to CRC: Mehul Parmar · MADHAPAR.`,
                  [],
                  { actions: [
                    { label: '🔁 Track', trigger: 'dv:canvas:list', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'resubmit') {
                addBot(
                  `✓ ${ev.correction || 'Application updated.'}\nResubmission #2 sent for review · App ${ev.appId}.`,
                  [],
                  { actions: [
                    { label: '📋 Application list', trigger: 'dv:canvas:list', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'approve') {
                addBot(
                  `✅ Application approved — ${ev.studentName} (${ev.appId}). Synced to IPMS for first-month payment.`,
                  [],
                  { actions: [
                    { label: '📋 Back to queue', trigger: 'dv:canvas:review', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'reject') {
                addBot(
                  `❌ Application rejected — ${ev.studentName} (${ev.appId}). Reason: ${ev.reason}. Teacher has been notified to correct & resubmit.`,
                  [],
                  { actions: [
                    { label: '📋 Back to queue', trigger: 'dv:canvas:review', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'optout') {
                addBot(
                  `📋 Application marked as NOT WANTED.\n\nStudent: ${ev.studentName}\nScheme: ${schemeName(ev.scheme)}\nDeclaration: ${ev.declarationFile?.name || 'declaration.pdf'}\n\nYou can edit later if the student changes their mind.`,
                  [],
                  { actions: [
                    { label: '📋 Application list', trigger: 'dv:canvas:list', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'paymentSuccess') {
                addBot(
                  `✅ Payment successful. UTR recorded for ${ev.studentName}${ev.utr ? ` · ${ev.utr}` : ''}.`,
                  [],
                  { actions: [
                    { label: '🏦 Payment queue', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
                    homeAction,
                  ] }
                )
              } else if (ev.kind === 'paymentRetry') {
                addBot(
                  `🔄 Retry payment processed for ${ev.studentName}. UTR will be recorded once PFMS confirms.`,
                  [],
                  { actions: [
                    { label: '🏦 Payment queue', trigger: 'dv:canvas:payment-queue', variant: 'primary' },
                    homeAction,
                  ] }
                )
              }
            },
          }
          // Defer slightly so the chat message lands first.
          setTimeout(() => openCanvas(ctx), 200)
        }
      }
      return
    }

    if (!silent) {
      setMessages(prev => [...prev, { id: Date.now(), role:'user', text, opts:[] }])
    }

    // ── Mid-collection flow ──────────────────────────────────────────────
    if (collectState) {
      const flow  = TASK_FLOWS[collectState.taskId]
      const step  = flow.steps[collectState.stepIdx]
      const newCtx = { ...collectState.ctx, [step.key]: text }
      const nextStep = collectState.stepIdx + 1

      if (nextStep < flow.steps.length) {
        const next = flow.steps[nextStep]
        setCollect({ taskId: collectState.taskId, stepIdx: nextStep, ctx: newCtx })
        addBot(next.prompt, next.opts || [])
      } else {
        setCollect(null)
        if (typeof flow.openCanvasOnComplete === 'function') {
          // Flows that complete by opening a right-side canvas (e.g. the
          // attendance marking webview). Show a short progress bubble in chat
          // so the user sees the hand-off, then open the canvas.
          const ctxOut = flow.openCanvasOnComplete(newCtx) || {}
          const doneText = typeof flow.done === 'function' ? flow.done(newCtx) : flow.done
          addBot(doneText, [], { progress: flow.progress })
          setTimeout(() => openCanvas({ ...ctxOut, role }), 300)
        } else if (flow.inline && flow.buildInline) {
          const html = flow.buildInline(newCtx)
          const doneText = typeof flow.done === 'function' ? flow.done(newCtx) : flow.done
          addBot(doneText, [], { html, actions: flow.actions, progress: flow.progress })
        } else {
          const af = flow.build(newCtx)
          const doneText = typeof flow.done === 'function' ? flow.done(newCtx) : flow.done
          // Build an expandable card for the artifact
          const card = { title: af.title, icon: af.icon, subtitle: `${SCHOOL} · ${TODAY}`,
            preview: `<div style="font-size:11px;color:#666;max-height:60px;overflow:hidden">${(af.html||'').slice(0,200)}...</div>`,
            fullHtml: af.html, timestamp: Date.now() }
          addBot(doneText, [], { card, progress: flow.progress })
        }
      }
      return
    }

    // ── Greeting ─────────────────────────────────────────────────────────
    const gr = greetingReply(text, activeBot, role, userProfile)
    if (gr) { addBot(gr); return }

    // ── Bot switch ────────────────────────────────────────────────────────
    const botMatch = bots.find(b => text.toLowerCase().includes(b.toLowerCase()) && b !== bots[0])
    if (botMatch) {
      setActiveBot(botMatch)
      addBot(`${botMatch} activated. How can I help you?`)
      return
    }

    // ── Task detection ────────────────────────────────────────────────────
    const taskId = detectTask(text)
    if (taskId) {
      const flow = TASK_FLOWS[taskId]
      if (flow.steps.length === 0) {
        if (flow.inline && flow.buildInline) {
          const html = flow.buildInline({})
          const doneText = typeof flow.done === 'function' ? flow.done({}) : flow.done
          addBot(doneText, [], { html, actions: flow.actions, progress: flow.progress })
        } else {
          const af = flow.build({})
          const doneText = typeof flow.done === 'function' ? flow.done({}) : flow.done
          const card = { title: af.title, icon: af.icon, subtitle: `${SCHOOL} · ${TODAY}`,
            preview: `<div style="font-size:11px;color:#666;max-height:60px;overflow:hidden">${(af.html||'').slice(0,200)}...</div>`,
            fullHtml: af.html, timestamp: Date.now() }
          addBot(doneText, [], { card, progress: flow.progress })
        }
      } else {
        setCollect({ taskId, stepIdx: 0, ctx: {} })
        const first = flow.steps[0]
        addBot(first.prompt, first.opts || [])
      }
      return
    }

    // ── LLM-style natural language understanding ───────────────────────
    const q = text.toLowerCase()
    const has = (...kw) => kw.some(k => q.includes(k))
    const firstName = userProfile?.name?.split(' ')[0] || ''

    // Conversational acknowledgments (random prefix)
    const ack = ['Sure!', 'On it!', 'Great question!', 'Absolutely!', 'Of course!', 'Let me help with that.', 'Right away!'][Math.floor(Math.random() * 7)]

    // ── Thank you / polite ─────────────────────────────────────────────
    if (has('thank','thanks','thx','dhanyavaad')) {
      // Parent should only see chips about their child.
      const followups = role === 'parent'
        ? ["My child's attendance", 'Latest result', 'Homework', 'Message teacher']
        : role === 'crc'   ? ['Pending reviews', 'Resubmitted queue', 'Approval summary']
        : role === 'pfms'  ? ['Payment queue', 'Failed payments', 'UTR success']
        : role === 'state_secretary' ? ['State dashboard', 'Funnel analytics', 'District comparison']
        : role === 'deo'   ? ['District dashboard', 'Failed payments', 'Below attendance']
        : ['Mark attendance','Show dashboard','At-risk students']
      addBot(`You're welcome${firstName ? `, ${firstName}` : ''}! 😊 Is there anything else I can help you with?`, followups)
      return
    }

    // ── Daily brief / today / what to do ────────────────────────────────
    if (has('daily brief','what should i do','today','my day','morning brief','summary')) {
      // Same cohort-builder the canvas + the At-Risk home tile use, so the
      // brief always matches the tile counts.
      const risk = getAtRiskCohort(role, userProfile, {}).atRisk.total
      const pending = NAMO_LAXMI_APPS?.filter(a => a.status === 'pending')?.length || 0
      const briefs = {
        teacher: `📋 **Your Daily Brief — ${TODAY}**\n\n📅 Attendance not yet marked for today\n⚠️ ${risk} high-risk students need attention\n📋 ${pending} Namo Laxmi applications pending\n📊 Class 8 average: ${PERF_DATA[8]?.math || 74}% (Math)\n\nWhat would you like to tackle first?`,
        principal: `📋 **School Daily Brief — ${TODAY}**\n\n🏫 School attendance: 88.3% (342 students)\n⚠️ ${risk} students at high risk across school\n📋 ${pending} Namo Laxmi pending approvals\n👩‍🏫 2 teachers yet to mark attendance\n\nWhat would you like to review?`,
        deo: `📋 **District Brief — ${TODAY}**\n\n🏫 412 schools reporting (98% submission)\n📅 District attendance: 84.2%\n⚠️ 142 schools below 75% threshold\n🔴 3 anomalies flagged for review\n\nWhere should we start?`,
        state_secretary: `📋 **State Command Brief — ${TODAY}**\n\n🏛️ 33 districts · 33,248 schools\n👥 82.4 lakh students enrolled\n📅 State attendance: 85.4%\n⚠️ 3 districts below 80% threshold\n📊 Namo Laxmi: 79.8% disbursement rate\n\nWhat needs your attention?`,
        parent: `📋 **${userProfile?.childName || 'Your Child'}'s Update — ${TODAY}**\n\n📅 Attendance this month: 74% (⚠️ below 80% target)\n📊 Last test score: 68% (Science)\n📖 Homework due: Math Ex. 7.3\n\nWhat would you like to check?`,
      }
      // Parent-only chip set: scoped to their child, no school-wide / Namo
      // Laxmi management options.
      const briefChips = role === 'parent'
        ? ["My child's attendance", 'Latest result', 'Homework', 'Message teacher']
        : ['Mark attendance','At-risk students','Namo Laxmi','Show dashboard']
      addBot(briefs[role] || briefs.teacher, briefChips)
      return
    }

    // ── How are students / how is school ────────────────────────────────
    if (has('how are','how is my','how\'s my','status of','doing')) {
      if (has('student','class','kids','children','child','ravi')) {
        handleSend('Task: class_performance'); return
      }
      if (has('school')) { handleSend('Task: dashboard'); return }
      if (has('district')) { handleSend('Task: district_dashboard'); return }
    }

    // ── Who was absent / absent today ───────────────────────────────────
    if (has('who was absent','absent today','absent student','who is absent','missing')) {
      handleSend('Task: attendance'); return
    }

    // ── Any problems / alerts / issues ──────────────────────────────────
    if (has('problem','alert','issue','concern','anomaly','war room','flagged')) {
      // Parents only see signals about their own child — never school-wide
      // / scholarship-management / war-room views.
      if (role === 'parent') {
        const childName = userProfile?.childName || 'your child'
        addBot(
          `${ack} Here's what needs attention for ${childName}:\n\n📅 **Attendance below 80%** this month\n📊 **Last test score:** 68% (Science)\n📖 **Homework due:** Math Ex. 7.3\n\nWhat would you like to look at?`,
          ["My child's attendance", "Latest result", "Homework", 'Message teacher'],
          { progress: ['Checking your child’s record...', 'Fetching latest update...'] }
        )
        return
      }
      // Cohort-builder so the chat reply matches the home At-Risk tile.
      const risk = getAtRiskCohort(role, userProfile, {}).atRisk.total
      addBot(`${ack} I found some items that need attention:\n\n🔴 **${risk} students at risk** — chronic absence or low scores\n⚠️ **3 anomalies detected** — Daskroi below 75% threshold\n📋 **2 pending** Namo Laxmi applications need review\n\nWhich would you like to look at first?`,
        ['At-risk students','Namo Laxmi','School dashboard','War room alerts'],
        { progress: ['Scanning alerts...', 'Checking anomalies...'] })
      return
    }

    // ── XAMTA / scan ────────────────────────────────────────────────────
    if (has('xamta','scan','answer sheet','omr')) {
      const isMobile = window.innerWidth < 768
      const xamtaHtml = `
        <div style="margin-top:8px;font-family:${DS.font}">
          <div style="font-size:12px;font-weight:400;letter-spacing:0.4px;color:${DS.textSecondary};margin-bottom:12px"><strong style="color:${DS.textPrimary};font-weight:600">XAMTA Assessment Scanner</strong> — Upload or scan answer sheets</div>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <div onclick="document.getElementById('xamta-upload')?.click()" style="flex:1;background:${DS.brandSubtle};border:2px dashed ${DS.brand};border-radius:${DS.radiusLg}px;padding:16px;text-align:center;cursor:pointer">
              <div style="font-size:24px;margin-bottom:8px">📤</div>
              <div style="font-size:12px;font-weight:500;letter-spacing:0.25px;color:${DS.brand}">Upload Image/PDF</div>
            </div>
            ${isMobile ? `<div onclick="window._vskXamtaScan?.()" style="flex:1;background:${DS.successSubtle};border:2px dashed ${DS.success};border-radius:${DS.radiusLg}px;padding:16px;text-align:center;cursor:pointer">
              <div style="font-size:24px;margin-bottom:8px">📷</div>
              <div style="font-size:12px;font-weight:500;letter-spacing:0.25px;color:${DS.successText}">Open Camera</div>
            </div>` : ''}
          </div>
          <input type="file" id="xamta-upload" accept="image/*,.pdf" style="display:none" onchange="window._vskXamtaFile?.(this)" />
          <div style="font-size:11px;font-weight:400;letter-spacing:0.2px;color:${DS.textTertiary}">Or enter marks manually using the form below</div>
        </div>`
      addBot(`${ack} XAMTA Scanner is ready.`, [], {
        html: xamtaHtml,
        actions: [
          { label: '📝 Enter marks by form', trigger: '_xamta_form', variant: 'primary' },
          { label: '📊 View past results', trigger: 'Task: learning_outcomes', variant: 'primary' },
        ],
        progress: ['Initializing XAMTA scanner...', 'Loading answer key templates...'],
      })
      return
    }

    // ── Parent alerts / notify ──────────────────────────────────────────
    if (has('parent alert','parent connect','notify parent','send alert','whatsapp','sms')) {
      addBot(`${ack} I'll help you send parent notifications.\n\nWhich class should receive the alert?`,
        ['Class 6','Class 8','All classes','Only absent students\' parents'])
      return
    }

    // ── Remediation / intervention ──────────────────────────────────────
    if (has('remediation','remedial','intervention','struggling','weak','improve')) {
      addBot(`${ack} Let me build a remediation plan.\n\nI can create targeted worksheets and activities for struggling students. Which subject needs intervention?`,
        ['Mathematics','Science','Gujarati','All subjects'])
      return
    }

    // ── Quiz / assessment builder ───────────────────────────────────────
    if (has('quiz','test','assessment','exam','question paper','worksheet')) {
      addBot(`${ack} Quiz Builder ready! 📝\n\nI can create MCQs, short answers, or mixed-format assessments aligned to GCERT learning outcomes.\n\nWhich subject and grade?`,
        ['Math - Grade 5','Science - Grade 6','Gujarati - Grade 8','Custom quiz'])
      return
    }

    // ── BRC / inspection ────────────────────────────────────────────────
    if (has('brc','crc','inspection','visit','monitoring','field')) {
      addBot(`${ack} BRC/CRC visit tools ready.\n\nI can help generate inspection checklists, log visit observations, or review past visit reports.`,
        ['Generate checklist','Log visit notes','View previous visits','Schedule next visit'])
      return
    }

    // ── Policy / compliance ─────────────────────────────────────────────
    if (has('policy','compliance','regulation','rte','guideline','circular')) {
      addBot(`${ack} Policy Advisor activated. 📜\n\nI can analyze education schemes, check compliance requirements, draft policy briefs, or review recent government circulars.\n\nWhat do you need?`,
        ['Scheme compliance','Draft policy brief','RTE guidelines','Recent circulars'])
      return
    }

    // ── Message teacher / contact ───────────────────────────────────────
    if (has('message teacher','contact teacher','talk to teacher','call teacher')) {
      addBot(`📩 Message sent to ${SCHOOL_INFO?.name || 'the school'} teacher. You'll receive a reply within 24 hours.\n\nIs there anything specific you'd like me to include in the message?`)
      return
    }

    // ── Student lookup ──────────────────────────────────────────────────
    if (has('student','enrollment','enroll','register','data entry')) {
      addBot(`${ack} Student data tools ready.\n\nI can help with new enrollments, record updates, or scheme eligibility checks.`,
        ['New enrollment','Update records','Scheme eligibility','Search student'])
      return
    }

    // ── Homework / assignment ───────────────────────────────────────────
    if (has('homework','assignment','classwork','home work')) {
      addBot(`📖 Here are the pending assignments:\n\n• **Math Ex. 7.3** (Q1-5) — Due tomorrow\n• **Science diagram** — Photosynthesis — Due Friday\n• **Gujarati essay** — My School — Due next week\n\nWould you like to create a new assignment?`,
        ['Create assignment','View submissions','Send reminder to parents'])
      return
    }

    // ── Global NLP layer — last comprehension pass before fallback ──────
    // Catches multilingual / Hinglish phrasings that the keyword-block above
    // missed, plus resumes any pending clarify/confirm step. Existing exact
    // matches (TASK_FLOWS triggers, dv:* directives, greetings, etc.) win
    // first because this block sits AFTER them.

    // Shared dispatch — routes a router result (sync or async) to chat/canvas.
    // Returns true if the result was handled, false on `unknown`.
    const dispatchNlpResult = (nlp) => {
      if (nlp.kind === 'answer') {
        // RAG-grounded knowledge answer. Render as an inline HTML card with
        // citations. No action fired — answers are explanatory only.
        pendingNlp.current = null
        addBot('', [], {
          html: aiAnswerCardHtml({
            text: nlp.text,
            citations: nlp.citations,
            language: nlp.language,
          }),
          actions: [
            { label: '🔁 Ask another question', trigger: 'Ask DigiVritti AI', variant: 'primary' },
          ],
        })
        return true
      }
      if (nlp.kind === 'execute') {
        pendingNlp.current = null
        const d = nlp.directive || {}
        const meta = nlp.meta || null
        if (meta?.assistantText) {
          // Friendly LLM preamble before the synthetic trigger fires.
          addBot(meta.assistantText)
        }
        if (d.trigger) {
          // Re-enter handleSend with the existing trigger string so the
          // existing canvas / chat handlers do the actual work. silent:true
          // keeps the synthetic trigger out of the user-bubble area. Defer
          // one tick so React commits the user message first.
          setTimeout(() => handleSend(d.trigger, { silent: true }), 0)
        } else if (d.canvas) {
          openCanvas({ ...d.canvas, role })
        } else if (d.notification) {
          // Notification-module directives: open the notifications canvas in
          // the requested view, optionally with a prefilled broadcast form,
          // or run a no-UI bulk action like "mark all read".
          if (d.notification.markAllRead) {
            markAllNotificationsRead?.()
            addBot('All notifications marked as read.')
          } else {
            const view = d.notification.view || 'list'
            openNotificationsCanvas?.({
              view,
              broadcastPrefill: view === 'broadcast' ? (d.notification.prefill || null) : null,
            })
          }
        } else if (d.reply) {
          addBot(d.reply.text || '', d.reply.chips || [], {
            html: d.reply.html,
            actions: d.reply.actions,
          })
        }
        return true
      }
      if (nlp.kind === 'clarify') {
        pendingNlp.current = nlp.pendingAction
        addBot(nlp.prompt, nlp.chips || [])
        return true
      }
      if (nlp.kind === 'confirm') {
        pendingNlp.current = nlp.pendingAction
        addBot(nlp.prompt, [], {
          actions: (nlp.chips || []).map(label => ({
            label, trigger: label,
            variant: label.startsWith('✅') ? 'ok' : 'err',
          })),
        })
        return true
      }
      if (nlp.kind === 'denied') {
        pendingNlp.current = null
        addBot(nlp.reason || 'Not allowed.')
        return true
      }
      if (nlp.kind === 'module-fallback') {
        pendingNlp.current = null
        addBot(nlp.module.fallbackPrompt, [])
        return true
      }
      return false
    }

    {
      const nlpSync = routeIntentSync({
        text,
        role,
        pendingAction: pendingNlp.current,
      })
      if (dispatchNlpResult(nlpSync)) return

      // ── Layer 2: remote LLM (Groq). Only fire if local came back unknown
      // and a backend URL is configured. Failure paths (no env var, network
      // down, malformed JSON) all resolve to null inside aiClient, so we
      // gracefully fall through to the smart fallback below.
      if (nlpSync.kind === 'unknown' && isRemoteEnabled() && !text.toLowerCase().startsWith('task:') && !text.toLowerCase().startsWith('dv:')) {
        setTyping(true)
        ;(async () => {
          try {
            const nlpRemote = await routeIntent({
              text,
              role,
              pendingAction: pendingNlp.current,
            })
            setTyping(false)
            if (!dispatchNlpResult(nlpRemote)) {
              // Remote was also unknown — fall back to smart suggestions.
              const opts = (
                role === 'parent' ? ['My child attendance','Latest result','Homework','Message teacher'] :
                role === 'pfms' ? ['Payment queue','Failed payments','UTR success'] :
                role === 'crc' ? ['Pending reviews','Approval summary'] :
                ['Mark attendance','Show dashboard','At-risk students']
              )
              addBot(`I'm not sure I understood "${text}". Try one of these:`, opts)
            }
          } catch {
            setTyping(false)
          }
        })()
        return
      }
      // kind === 'unknown' AND no remote → fall through to smart fallback.
    }

    // ── Anything else — smart fallback ──────────────────────────────────
    const fallbackOpts = {
      teacher:         ['Mark attendance','Lesson plan','At-risk students','XAMTA scan','Namo Laxmi','Scholarship status','Generate report','Class performance'],
      principal:       ['School dashboard','Attendance summary','At-risk students','Scholarship status','Generate report','War room'],
      deo:             ['District dashboard','Block analysis','Scholarship status','War room','Learning outcomes','At-risk students'],
      state_secretary: ['State dashboard','District drilldown','Namo Laxmi','Scholarship status','Learning outcomes','Dropout risk'],
      parent:          ['My child attendance','Scholarship status','Download report','Message teacher'],
    }

    const smartFallbacks = [
      `I'm not sure I understood "${text}" — but I can help with a lot! Here are some things I can do for you:`,
      `Hmm, I didn't quite catch that. ${firstName ? `${firstName}, h` : 'H'}ere's what I can help with:`,
      `I'd love to help! I didn't find a match for "${text}", but try one of these:`,
      `Let me suggest some options — just tap one or describe what you need in more detail:`,
    ]
    addBot(smartFallbacks[Math.floor(Math.random() * smartFallbacks.length)],
      fallbackOpts[role] || fallbackOpts.teacher)
  }, [collectState, activeBot, bots, addBot, openArtifact, role, userProfile, openCanvas, activeChatId, createChat])

  // Keep the ref pointed at the latest handleSend so the queue-drain effect
  // can call it without re-running every time the callback identity changes.
  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  // ── Design Tool handler (Canva / Adobe) ──────────────────────────────────
  // Routes through the new WorksheetTemplateCanvas + WorksheetEditorCanvas
  // flow so the user can pick a template + style before landing on the
  // editor. The legacy hardcoded card-builder has been retired.
  const handleDesignTool = useCallback((text, tool) => {
    setMessages(prev => [...prev, { id: Date.now(), role:'user', text: `[${tool === 'canva' ? '🎨 Canva' : '🅰️ Adobe'}] ${text}`, opts:[] }])
    setActiveTool(null)

    const q = (text || '').toLowerCase()

    // Best-effort topic / subject extraction so the picker lands populated.
    const gradeMatch = q.match(/(?:grade|class)\s*(\d+)/i)
    const classId = gradeMatch ? `Class ${gradeMatch[1]}` : 'Class 6'
    const topicMatch = q.match(/(?:on|about|for|topic)\s+(.+?)(?:\s+for|\s+grade|\s+class|$)/i)
    const fallbackTitle = (text || '').replace(/^(create|make|design|generate)\s+/i,'').replace(/\s+(with|using|in)\s+(canva|adobe).*/i,'').trim()
    const topic = topicMatch ? topicMatch[1].replace(/^(a|the)\s/i,'').trim() : (fallbackTitle || 'Fractions Readiness')
    const subject = q.includes('math') ? 'Mathematics'
                  : q.includes('sci') ? 'Science'
                  : q.includes('guj') ? 'Gujarati'
                  : 'Mathematics'

    const toolLabel = tool === 'canva' ? 'Canva' : 'Adobe Express'

    addBot(`✨ Opening the ${toolLabel}-style template picker for "${topic}".`, [], {
      progress: [
        `Opening ${toolLabel} workspace...`,
        'Loading design templates...',
        'Pre-selecting style...',
      ],
    })

    // Defer slightly so the chat update commits before the canvas slides in.
    setTimeout(() => {
      openCanvas({
        type: 'worksheet-template',
        subject,
        topic,
        classId,
        preferredStyle: tool === 'adobe' ? 'adobe' : 'canva',
        sourceLessonPlan: null,
        sourceGroup: null,
      })
    }, 300)
  }, [addBot, openCanvas])


  const handleNew = useCallback(() => {
    // Persist any pending messages on the current chat first.
    if (activeChatId && messages.length > 0) setChatMessages(activeChatId, messages)
    // Pre-clear local state IN THE SAME React batch as createChat so the
    // user never sees the previous chat's content bleeding into the new
    // thread for even one frame. The hydrate effect runs afterwards but is
    // a no-op for the empty new chat.
    setMessages([])
    setCollect(null)
    setArtifact(null)
    setActiveTool(null)
    pendingNlp.current = null
    createChat({ title: 'New chat' })
    setSidebar(false)
  }, [activeChatId, messages, createChat, setChatMessages])

  const handleSelectChat = useCallback((chatId) => {
    if (!chatId || chatId === activeChatId) { setSidebar(false); return }
    // Save the current chat's messages before switching away.
    if (activeChatId && messages.length > 0) setChatMessages(activeChatId, messages)
    // Pre-clear so the previous chat's bubbles don't render under the new
    // chat's incoming messages during the switch. Hydrate then loads the
    // selected chat's persisted messages on the next render.
    setMessages([])
    setCollect(null)
    setArtifact(null)
    setActiveTool(null)
    pendingNlp.current = null
    switchChat(chatId)
    setSidebar(false)
  }, [activeChatId, messages, switchChat, setChatMessages])

  // Grouped chats for the sidebar — only ever shows the current user's chats.
  const chatGroups = React.useMemo(
    () => groupByRecency(userChats || []),
    [userChats]
  )

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#ECECEC' }}>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden absolute inset-0 z-30 bg-black/40" onClick={() => setSidebar(false)} />
      )}
      <div className={`
        md:flex flex-shrink-0 h-full z-40
        absolute md:relative
        transition-transform duration-300
        ${sidebarOpen ? 'flex translate-x-0' : 'hidden -translate-x-full md:translate-x-0'}
      `}>
        <VSKSidebar
          onNew={handleNew}
          activeChatId={activeChatId}
          chatGroups={chatGroups}
          onSelect={handleSelectChat}
          onDelete={(id) => {
            // Don't allow deleting the chat you're currently in without a
            // replacement — keep things simple, switch to another first.
            if (id === activeChatId) return
            deleteChat(id)
          }}
          role={role}
          userProfile={userProfile}
          onClose={() => setSidebar(false)}
          onSwitchRole={switchRole}
          onNavigate={navigate}
          onSignOut={signOut}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full" style={{ background: '#ECECEC' }}>

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 bg-white" style={{ borderBottomColor: '#D5D8DF' }}>
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#ECECEC]"
            onClick={() => setSidebar(true)}
            style={{ color: '#7383A5' }}
          >
            <Menu size={18} />
          </button>

          <span style={{ fontSize: 16, fontWeight: 700, lineHeight: '20px', color: '#0E0E0E', fontFamily: 'Montserrat, sans-serif' }}>VSK Gujarat</span>

          <div className="flex-1" />

          <InlineCallControls />
          <CallAgentButton />
          <NotificationBell />
        </div>

        {/* Chat + artifact split */}
        <div className="flex-1 flex min-h-0">

          {/* Message list */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: '#FFFFFF' }}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 pt-4" style={{ background: '#FFFFFF', paddingBottom: 16 }}>
              {!hasMessages ? (
                // WelcomeScreen now contains the KPI report card (when the role
                // has KPIs) injected between its alerts strip and Quick Actions.
                // Roles with no KPIs (deo) see the original WelcomeScreen.
                <WelcomeScreen botName={activeBot} onChip={handleSend} role={role} profile={userProfile} onOpenCanvas={ctx => openCanvas({ ...ctx, role })} />
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      onChipClick={handleSend}
                      onCardClick={(card) => setWebview(card)}
                      onAction={(a) => {
                        if (a.trigger === '_submit_att') {
                          addBot('✅ Attendance submitted successfully! Parent alerts queued for 5:00 PM.', [], {
                            progress: ['Saving attendance records...', 'Queuing parent SMS alerts...', 'Done!'],
                            actions: [
                              { label: '📊 View dashboard', trigger: 'Task: dashboard', variant: 'primary' },
                              { label: '📨 Send alerts now', trigger: 'parent alert', variant: 'warn' },
                            ]
                          })
                        } else if (a.trigger === '_xamta_form') {
                          const results = XAMTA_SAMPLE_RESULTS || []
                          const rows = results.map(r => `<div style="display:flex;align-items:center;padding:12px;border-bottom:1px solid ${DS.borderSubtle};gap:8px;font-family:${DS.font}">
                            <div style="flex:1">
                              <div style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${DS.textPrimary}">${r.student}</div>
                              <div style="color:${DS.textTertiary};font-size:11px;font-weight:500;letter-spacing:0.2px;margin-top:2px">Grade ${r.grade} · ${r.subject}</div>
                            </div>
                            <span style="font-size:14px;font-weight:600;letter-spacing:-0.2px;color:${r.score/r.total>=0.7?DS.successText:DS.errorText}">${r.score}/${r.total}</span>
                          </div>`).join('')
                          addBot('📊 XAMTA scan results processed:', [], {
                            html: `<div style="margin-top:8px"><div style="border:1px solid ${DS.borderDefault};border-radius:${DS.radiusLg}px;overflow:hidden;background:${DS.surfaceRaised}">${rows}</div></div>`,
                            progress: ['Processing scanned sheets...', 'Matching answer keys...', 'Calculating LO scores...'],
                            actions: [
                              { label: '📥 Save results', trigger: '_save_xamta', variant: 'ok' },
                              { label: '📊 View outcomes', trigger: 'Task: learning_outcomes', variant: 'primary' },
                            ]
                          })
                        } else {
                          handleSend(a.trigger)
                        }
                      }}
                    />
                  ))}
                  {typing && <TypingIndicator />}
                  {progressSteps && <ProgressText steps={progressSteps} />}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
            <InputBar
              onSend={(text, tool) => tool ? handleDesignTool(text, tool) : handleSend(text)}
              disabled={typing || !!progressSteps}
              activeBot={activeBot}
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              onAttach={(file) => addBot(`📎 File "${file.name}" received. What would you like to do with it?`, ['Scan with XAMTA', 'Attach to report', 'Upload to CTS'])}
            />
          </div>

          {/* Artifact panel — desktop inline */}
          {artifact && (
            <div className="hidden md:flex flex-col" style={{ width:'46%', maxWidth:520, minWidth:320 }}>
              <ArtifactPanel artifact={artifact} onClose={() => setArtifact(null)} />
            </div>
          )}
        </div>
      </div>

      {/* Artifact modal — mobile */}
      {artifact && <ArtifactModal artifact={artifact} onClose={() => setArtifact(null)} />}

      {/* Webview modal — for expanded card bubbles */}
      {webviewCard && <WebviewModal card={webviewCard} onClose={() => setWebview(null)} />}
    </div>
  )
}
