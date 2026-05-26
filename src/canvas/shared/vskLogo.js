// Inline SVG of the VSK Gujarat crest — saffron Sri Yantra with the two
// Sanskrit ribbons. Reusable across every print-to-PDF report so we never
// fall back to the "🏛️" emoji placeholder again.
//
// Sized via the wrapping element (default 70px wide). Color is locked to
// the saffron #F37021 used on the actual VSK letterhead.
export const VSK_LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220" width="60" height="66" aria-label="VSK Gujarat">
  <g fill="none" stroke="#F37021" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <!-- Top Sanskrit ribbon -->
    <text x="100" y="16" text-anchor="middle" font-family="Noto Sans Devanagari, Mangal, sans-serif"
      font-size="11" font-weight="700" fill="#F37021" stroke="none">|| प्रज्वालितो ज्ञानमयः प्रदीपः ||</text>

    <!-- 7 decorative flame curls across the top -->
    <g transform="translate(0, 30)">
      ${[0,1,2,3,4,5,6].map(i => {
        const x = 18 + i * 27
        return `<path d="M${x} 18 C ${x} 4, ${x + 18} 4, ${x + 18} 18 C ${x + 18} 28, ${x + 9} 34, ${x + 9} 24"/>`
      }).join('\n      ')}
    </g>

    <!-- Yantra pyramid: 7 rows of downward triangles, narrowing -->
    <g transform="translate(15, 60)">
      ${
        // row r has (7 - r) triangles, with width 24 each, offset by r * 12
        [0,1,2,3,4,5,6].map(r => {
          const count = 7 - r
          const offsetX = r * 12
          const y = r * 18
          return [0,1,2,3,4,5,6].slice(0, count).map(c => {
            const x = offsetX + c * 24
            // Downward triangle: left-top, right-top, bottom-center
            return `<polygon points="${x},${y} ${x + 24},${y} ${x + 12},${y + 20}"/>`
          }).join(' ')
        }).join('\n      ')
      }
    </g>

    <!-- Bottom Sanskrit ribbon -->
    <text x="100" y="210" text-anchor="middle" font-family="Noto Sans Devanagari, Mangal, sans-serif"
      font-size="11" font-weight="700" fill="#F37021" stroke="none">|| विद्या समीक्षा केन्द्र ||</text>
  </g>
</svg>
`.trim()
