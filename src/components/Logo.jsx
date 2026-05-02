import React from 'react'

const LOGO_URL = 'https://i.ibb.co/TMKP4j6D/Group-130690.png'

export default function Logo({ size = 36, showText = false, textColor = '#1A1F36' }) {
  return (
    <div className="flex items-center gap-2">
      <img
        src={LOGO_URL}
        alt="SwiftChat"
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block' }}
        draggable={false}
      />

      {showText && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.56, color: textColor, fontFamily: 'Montserrat, sans-serif' }}
        >
          Swift<span style={{ color: '#386AF6' }}>Chat</span>
        </span>
      )}
    </div>
  )
}
