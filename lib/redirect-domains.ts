"use client"

// Gestao simples de dominios para os redirecionadores.
// Persistido no localStorage por usuario (nao existe tabela dedicada no banco).
// O dominio escolhido e apenas para montar/exibir o link; o redirect real
// continua funcionando pela rota /s/[slug].

export type RedirectDomain = {
  id: string
  host: string
  isDefault?: boolean
}

const STORAGE_PREFIX = "dragon_redirect_domains_"

function keyFor(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

export function getDefaultDomain(): RedirectDomain {
  const host =
    typeof window !== "undefined" ? window.location.host : "app.dragon.bio"
  return { id: "default", host, isDefault: true }
}

export function getDomains(userId: string): RedirectDomain[] {
  const fallback = [getDefaultDomain()]
  if (typeof window === "undefined" || !userId) return fallback

  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as RedirectDomain[]
    if (!Array.isArray(parsed)) return fallback
    // Garante que o dominio padrao sempre exista no topo
    const withoutDefault = parsed.filter((d) => !d.isDefault)
    return [getDefaultDomain(), ...withoutDefault]
  } catch {
    return fallback
  }
}

export function saveDomains(userId: string, domains: RedirectDomain[]) {
  if (typeof window === "undefined" || !userId) return
  const custom = domains.filter((d) => !d.isDefault)
  localStorage.setItem(keyFor(userId), JSON.stringify(custom))
}

function normalizeHost(input: string): string {
  let host = input.trim().toLowerCase()
  host = host.replace(/^https?:\/\//, "")
  host = host.replace(/\/.*$/, "")
  return host
}

export function addDomain(userId: string, rawHost: string): RedirectDomain[] {
  const host = normalizeHost(rawHost)
  const current = getDomains(userId)
  if (!host) return current
  if (current.some((d) => d.host.toLowerCase() === host)) return current

  const next = [
    ...current,
    { id: `dom_${Date.now()}`, host },
  ]
  saveDomains(userId, next)
  return next
}

export function removeDomain(userId: string, id: string): RedirectDomain[] {
  const next = getDomains(userId).filter((d) => d.id !== id || d.isDefault)
  saveDomains(userId, next)
  return next
}
