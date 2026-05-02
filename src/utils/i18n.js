const strings = {
  en: {
    continue: 'Continue',
    sso: 'Login with State ID',
    phone: 'Login with Phone Number',
    sso_hint: 'For teachers, principals & government officials',
    phone_hint: 'For parents — uses phone OTP',
    ask: 'Message Swift…',
    back: 'Back',
    send: 'Send',
    chats: 'Chats',
    updates: 'Updates',
    profile: 'Profile',
    signOut: 'Sign Out',
    terms: "By continuing, I agree to SwiftChat's",
    tos: 'Terms of Service',
    privacy: 'User Privacy Policy',
  },
  gu: {
    continue: 'આગળ',
    sso: 'State ID થી Login',
    phone: 'ફોન નંબર થી Login',
    sso_hint: 'શિક્ષક, આચાર્ય & સ.ઓ. માટે',
    phone_hint: 'વાલી — ફોન OTP',
    ask: 'Swift ને સંદેશ…',
    back: 'પાછળ',
    send: 'મોકલો',
    chats: 'ચેટ',
    updates: 'અપડેટ',
    profile: 'પ્રોફાઇલ',
    signOut: 'સાઇન આઉટ',
    terms: 'આગળ વધવા દ્વારા, હું SwiftChat ની',
    tos: 'સેવાની શરતો',
    privacy: 'ગોપનીયતા નીતિ',
  },
  hi: {
    continue: 'आगे',
    sso: 'State ID से Login',
    phone: 'फ़ोन नंबर से Login',
    sso_hint: 'शिक्षक, प्रधानाध्यापक व अधिकारियों के लिए',
    phone_hint: 'अभिभावक — फ़ोन OTP',
    ask: 'Swift को संदेश…',
    back: 'वापस',
    send: 'भेजें',
    chats: 'चैट',
    updates: 'अपडेट',
    profile: 'प्रोफ़ाइल',
    signOut: 'साइन आउट',
    terms: 'जारी रखकर, मैं SwiftChat की',
    tos: 'सेवा शर्तें',
    privacy: 'गोपनीयता नीति',
  },
}

export function t(lang, key) {
  return (strings[lang] || strings.en)[key] || key
}

export default strings
