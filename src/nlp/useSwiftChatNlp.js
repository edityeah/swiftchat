// React hook around the global NLP router.
//
// Usage in handleSend:
//   const { dispatchNlp } = useSwiftChatNlp({ role, userProfile })
//   const result = await dispatchNlp(text)
//   if (result.handled) return  // NLP took it
//   // otherwise fall through to existing fallback logic
//
// The hook owns the small state machine for clarify → confirm → execute. It
// surfaces the directive to the caller via three callbacks so the actual
// execution stays in SuperHomePage (which has the addBot, openCanvas, and
// re-entry-into-handleSend powers).

import { useCallback, useRef } from 'react'
import { routeIntent } from './globalIntentRouter.js'

export function useSwiftChatNlp({
  role,
  userProfile,
  onTrigger,        // (triggerString, presetCtx?) → void
  onCanvas,         // (canvasContext) → void
  onReply,          // ({ text, html?, actions?, chips? }) → void
}) {
  // pendingAction tracks an in-flight clarify/confirm step. Resets after the
  // user resolves it (or after any non-NLP message arrives).
  const pendingRef = useRef(null)

  const reset = useCallback(() => { pendingRef.current = null }, [])

  const dispatchNlp = useCallback(async (text) => {
    if (!text || !role) return { handled: false }

    const result = await routeIntent({
      text,
      role,
      pendingAction: pendingRef.current,
    })

    switch (result.kind) {
      case 'execute': {
        pendingRef.current = null
        const d = result.directive || {}
        if (d.trigger) {
          onTrigger?.(d.trigger, d.preset || null)
        } else if (d.canvas) {
          onCanvas?.(d.canvas)
        } else if (d.reply) {
          onReply?.(d.reply)
        }
        return { handled: true }
      }

      case 'clarify': {
        pendingRef.current = result.pendingAction
        onReply?.({
          text: result.prompt,
          chips: result.chips,
        })
        return { handled: true }
      }

      case 'confirm': {
        pendingRef.current = result.pendingAction
        onReply?.({
          text: result.prompt,
          actions: (result.chips || []).map(label => ({
            label,
            // Re-feed the chip text into dispatchNlp via onTrigger; the
            // router will resolve via pendingAction.
            trigger: label,
            variant: label.startsWith('✅') ? 'ok' : 'err',
          })),
        })
        return { handled: true }
      }

      case 'denied': {
        pendingRef.current = null
        onReply?.({ text: result.reason || 'Not allowed.' })
        return { handled: true }
      }

      case 'module-fallback': {
        pendingRef.current = null
        onReply?.({
          text: result.module.fallbackPrompt,
          chips: (result.module.actions || []).slice(0, 4),
        })
        return { handled: true }
      }

      default:
        // Don't reset pendingRef here — the user might just be typing
        // chitchat between clarify steps. handleSend will reset via
        // resetPending() when an existing exact match wins.
        return { handled: false }
    }
  }, [role, onTrigger, onCanvas, onReply])

  return { dispatchNlp, resetPending: reset }
}
