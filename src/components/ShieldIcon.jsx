import React from 'react'

export default function ShieldIcon({ size = 26, color = '#fff', filled = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 2L4 6v7c0 6.5 4.3 12.6 10 14 5.7-1.4 10-7.5 10-14V6L14 2z"
        fill={filled ? 'rgba(56,106,246,0.15)' : 'rgba(255,255,255,0.22)'}
        stroke={color}
        strokeWidth="1.5"
      />
      <path
        d="M9 14l3.5 3.5L19 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
