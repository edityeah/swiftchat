import React from 'react'

/**
 * Auth illustration — two people with chat / phone motif.
 * Used on PhoneEntry, PhoneOTP, and similar white-bg auth pages.
 */
export default function PeopleIllustration({ width = 340, height = 340 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 340 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background blob */}
      <ellipse cx="170" cy="200" rx="148" ry="120" fill="#EEF3FF" />
      <ellipse cx="170" cy="200" rx="120" ry="100" fill="#E3EBFF" />

      {/* ── Woman (right) ── */}
      {/* Body */}
      <rect x="188" y="165" width="54" height="72" rx="20" fill="#F9FAFB" stroke="#E2E8F0" strokeWidth="1.5"/>
      {/* Dress accent */}
      <rect x="192" y="185" width="46" height="52" rx="16" fill="#C7D7FD"/>
      {/* Head */}
      <circle cx="215" cy="150" r="22" fill="#FDDCAB"/>
      {/* Hair */}
      <path d="M193 148 Q197 128 215 126 Q233 128 237 148 Q233 136 215 134 Q197 136 193 148Z" fill="#3D2B1F"/>
      {/* Hair bun */}
      <circle cx="237" cy="142" r="7" fill="#3D2B1F"/>
      {/* Face — eyes */}
      <circle cx="208" cy="148" r="2" fill="#3D2B1F"/>
      <circle cx="222" cy="148" r="2" fill="#3D2B1F"/>
      {/* Smile */}
      <path d="M208 157 Q215 162 222 157" stroke="#C2855A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Phone in hand */}
      <rect x="228" y="185" width="18" height="30" rx="4" fill="#1A1F36" stroke="#386AF6" strokeWidth="1.5"/>
      <rect x="231" y="189" width="12" height="20" rx="2" fill="#386AF6" opacity="0.7"/>
      <circle cx="237" cy="212" r="1.5" fill="white" opacity="0.8"/>

      {/* ── Man (left) ── */}
      {/* Body */}
      <rect x="98" y="162" width="58" height="75" rx="20" fill="#386AF6"/>
      {/* Collar */}
      <path d="M118 162 L127 178 L136 162" fill="white" opacity="0.9"/>
      {/* Head */}
      <circle cx="127" cy="145" r="23" fill="#FDDCAB"/>
      {/* Hair */}
      <path d="M104 144 Q106 122 127 120 Q148 122 150 144 Q146 128 127 126 Q108 128 104 144Z" fill="#2C1810"/>
      {/* Eyes */}
      <circle cx="120" cy="143" r="2" fill="#3D2B1F"/>
      <circle cx="134" cy="143" r="2" fill="#3D2B1F"/>
      {/* Smile */}
      <path d="M120 153 Q127 158 134 153" stroke="#C2855A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      {/* Arm + speech bubble */}
      <path d="M100 190 Q86 185 80 175" stroke="#386AF6" strokeWidth="8" strokeLinecap="round"/>
      {/* Speech bubble */}
      <rect x="48" y="140" width="56" height="36" rx="10" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M80 176 L78 184 L88 178 Z" fill="white"/>
      <rect x="54" y="148" width="36" height="4" rx="2" fill="#386AF6" opacity="0.5"/>
      <rect x="54" y="156" width="26" height="4" rx="2" fill="#CBD5E1" />
      <rect x="54" y="164" width="30" height="4" rx="2" fill="#CBD5E1" />

      {/* ── Chat bubble (woman) ── */}
      <rect x="232" y="136" width="72" height="40" rx="10" fill="#386AF6"/>
      <path d="M244 176 L242 184 L252 178Z" fill="#386AF6"/>
      <rect x="240" y="144" width="48" height="4" rx="2" fill="white" opacity="0.9"/>
      <rect x="240" y="152" width="36" height="4" rx="2" fill="white" opacity="0.6"/>
      <rect x="240" y="160" width="42" height="4" rx="2" fill="white" opacity="0.6"/>

      {/* ── Floating dots ── */}
      <circle cx="72" cy="230" r="5" fill="#386AF6" opacity="0.2"/>
      <circle cx="290" cy="120" r="7" fill="#386AF6" opacity="0.15"/>
      <circle cx="55" cy="120" r="4" fill="#7C3AED" opacity="0.15"/>
      <circle cx="300" cy="250" r="5" fill="#10B981" opacity="0.2"/>

      {/* Notification badges */}
      <circle cx="246" cy="179" r="8" fill="#EF4444"/>
      <text x="246" y="183" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">2</text>

      {/* Shield badge bottom */}
      <circle cx="170" cy="292" r="18" fill="white" stroke="#E2E8F0" strokeWidth="1.5"/>
      <path d="M170 281 L161 285V291C161 296.5 164.9 301.7 170 303C175.1 301.7 179 296.5 179 291V285L170 281Z" fill="#386AF6"/>
      <path d="M166 291L169 294L174 288" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
