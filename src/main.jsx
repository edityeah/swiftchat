import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// Side-effect: register Groq remote interpreter if VITE_SWIFTCHAT_AI_API_URL is set.
import './nlp/aiBootstrap'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
