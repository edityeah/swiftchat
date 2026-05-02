// SwiftChat Design System tokens used across DigiVritti UI.
// All values map to swiftchat-design-system.md semantic tokens.
export const DV = {
  // Color — semantic
  bgDefault:       '#FFFFFF',
  bgSurface:       '#ECECEC',
  bgSurfaceRaised: '#FFFFFF',
  bgSubtle:        '#D5D8DF',
  bgBrand:         '#386AF6',
  bgBrandSubtle:   '#EEF2FF',

  textPrimary:   '#0E0E0E',
  textSecondary: '#7383A5',
  textTertiary:  '#828996',
  textDisabled:  '#999999',
  textInverse:   '#FFFFFF',
  textBrand:     '#386AF6',
  textBrandSub:  '#345CCC',

  borderDefault: '#D5D8DF',
  borderSubtle:  '#ECECEC',
  borderStrong:  '#999999',
  borderBrand:   '#345CCC',
  borderFocus:   '#386AF6',
  borderError:   '#EB5757',

  // Status
  success:        '#00BA34',
  successText:    '#007B22',
  successSubtle:  '#CCEFBF',
  successBanner:  '#D4F5DC',
  warning:        '#F8B200',
  warningText:    '#9A6500',
  warningSubtle:  '#FDE1AC',
  warningBanner:  '#FFF3CC',
  error:          '#EB5757',
  errorText:      '#C0392B',
  errorSubtle:    '#FDEAEA',
  info:           '#84A2F4',
  infoText:       '#345CCC',
  infoSubtle:     '#C3D2FC',

  // Interactive
  interactive:         '#386AF6',
  interactiveHover:    '#1339A3',
  interactiveActive:   '#2B3E8B',
  interactiveDisabled: '#C3D2FC',

  // Chat
  userBubble: '#386AF6',
  botBubble:  '#ECECEC',
  userText:   '#FFFFFF',
  botText:    '#0E0E0E',
  timestamp:  '#828996',

  // Spacing tokens (px)
  s0: 0, s2: 2, s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s48: 48,

  // Radius tokens
  rNone: 0, rXs: 2, rSm: 4, rMd: 8, rLg: 12, rXl: 16, r2xl: 20, rFull: 999,

  // Typography
  fontFamily: 'Montserrat, sans-serif',
}

// Text style helpers — each returns a style object matching design system styles.
export const TS = {
  titleLarge:    { fontSize: 16, fontWeight: 700, lineHeight: '20px',  letterSpacing: 0,      fontFamily: DV.fontFamily },
  titleMedium:   { fontSize: 16, fontWeight: 600, lineHeight: '20px',  letterSpacing: '0.1px',fontFamily: DV.fontFamily },
  titleSmall:    { fontSize: 14, fontWeight: 600, lineHeight: '20px',  letterSpacing: '-0.2px',fontFamily: DV.fontFamily },
  headingMedium: { fontSize: 24, fontWeight: 600, lineHeight: '32px',  letterSpacing: 0,      fontFamily: DV.fontFamily },
  headingSmall:  { fontSize: 20, fontWeight: 600, lineHeight: '28px',  letterSpacing: 0,      fontFamily: DV.fontFamily },
  bodyLarge:     { fontSize: 16, fontWeight: 400, lineHeight: '24px',  letterSpacing: '0.5px',fontFamily: DV.fontFamily },
  bodyMedium:    { fontSize: 14, fontWeight: 400, lineHeight: '20px',  letterSpacing: '0.25px',fontFamily: DV.fontFamily },
  bodySmall:     { fontSize: 12, fontWeight: 400, lineHeight: '16px',  letterSpacing: '0.4px',fontFamily: DV.fontFamily },
  labelLarge:    { fontSize: 16, fontWeight: 500, lineHeight: '20px',  letterSpacing: '0.1px',fontFamily: DV.fontFamily },
  labelMedium:   { fontSize: 14, fontWeight: 500, lineHeight: '20px',  letterSpacing: '0.1px',fontFamily: DV.fontFamily },
  labelSmall:    { fontSize: 12, fontWeight: 500, lineHeight: '16px',  letterSpacing: '0.25px',fontFamily: DV.fontFamily },
  caption:       { fontSize: 11, fontWeight: 500, lineHeight: '14px',  letterSpacing: '0.2px',fontFamily: DV.fontFamily },
  captionSmall:  { fontSize: 10, fontWeight: 400, lineHeight: '14px',  letterSpacing: '0.2px',fontFamily: DV.fontFamily },
}
