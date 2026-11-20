// Version artifact : pas de service worker (non autorisé dans le cadre claude.ai)
export function registerSW(_opts?: unknown) {
  return () => Promise.resolve()
}
