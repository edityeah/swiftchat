// Side-effect import — registers the Groq remote interpreter once at boot.
//
// Imported from src/main.jsx (or App.jsx). The registration is no-op if
// VITE_SWIFTCHAT_AI_API_URL is missing, so dev/staging without the backend
// still works on local-only NLP.

import { registerRemoteInterpreter } from './aiClient.js'
import { groqInterpreter, isRemoteEnabled } from './groqInterpreter.js'

if (isRemoteEnabled()) {
  registerRemoteInterpreter(groqInterpreter)
  if (typeof console !== 'undefined') {
    console.info('[swiftchat-nlp] remote interpreter registered')
  }
}
