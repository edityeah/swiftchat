export function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}
