// Accès aux fonctions de claude.ai quand Life tourne comme artifact.
// Hors de claude.ai (GitHub Pages, local), window.claude n'existe pas : tout se désactive proprement.

export interface McpCallResult {
  content?: { type: string; text?: string }[]
  payload?: unknown
}

export interface McpError {
  code: string
  message?: string
  retryable?: boolean
  retryAfterMs?: number
}

export interface McpNamespace {
  callTool(server: string, tool: string, input?: unknown, options?: { cache?: false | { staleTime?: number; gcTime?: number; refresh?: boolean } }): Promise<McpCallResult>
}

export interface DbDocSnapshot {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
}

export interface DbNamespace {
  doc(path: string): {
    get(): Promise<DbDocSnapshot>
    set(data: Record<string, unknown>): Promise<void>
    delete(): Promise<void>
  }
  collection(path: string): {
    get(): Promise<{ docs: DbDocSnapshot[] }>
    onSnapshot(next: (snap: { docs: DbDocSnapshot[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } }) => void, error?: (e: { code: string }) => void): () => void
  }
}

export interface DownloadsNamespace {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: string }>
}

export interface SampleOptions {
  modelTier?: 'quick' | 'default' | 'complex'
  images?: Blob | Blob[]
  signal?: AbortSignal
  cache?: boolean | { gcTime?: number; refresh?: boolean }
}

export interface SampleNamespace {
  (input: string, options?: SampleOptions): Promise<{ text: string; truncated: boolean }>
  json<T = unknown>(input: string, options?: SampleOptions): Promise<T>
  limits(): Promise<{ maxPromptBytes: number; images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>
}

export interface SampleError {
  code: string
  message?: string
  text?: string
}

interface CapabilityMap {
  mcp: McpNamespace
  db: DbNamespace
  downloads: DownloadsNamespace
  sample: SampleNamespace
}

declare global {
  interface Window {
    claude?: { use?: (name: string) => Promise<unknown> }
  }
}

/** Vrai quand la page est servie par claude.ai (artifact) */
export function inClaude(): boolean {
  return typeof window !== 'undefined' && typeof window.claude?.use === 'function'
}

const cache = new Map<string, Promise<unknown>>()

export function useCapability<K extends keyof CapabilityMap>(name: K): Promise<CapabilityMap[K] | null> {
  if (!inClaude()) return Promise.resolve(null)
  if (!cache.has(name)) {
    cache.set(
      name,
      Promise.race([
        window.claude!.use!(name).catch(() => null),
        new Promise((r) => setTimeout(() => r(null), 12000)),
      ]),
    )
  }
  return cache.get(name) as Promise<CapabilityMap[K] | null>
}

/** Texte renvoyé par un outil MCP (les outils COROS répondent en texte formaté) */
export function resultText(r: McpCallResult): string {
  if (typeof r.payload === 'string') return r.payload
  const t = r.content?.find((c) => c.type === 'text')?.text
  if (typeof t === 'string') {
    if (t.startsWith('"')) {
      try {
        const v = JSON.parse(t)
        if (typeof v === 'string') return v
      } catch {
        /* texte brut */
      }
    }
    return t
  }
  return r.payload != null ? JSON.stringify(r.payload) : ''
}
