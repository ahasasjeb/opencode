export function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export function base64Decode(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function hash(content: string, algorithm = "SHA-256"): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest(algorithm, data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}

export function checksum(content: string): string | undefined {
  if (!content) return undefined
  let hash = 0x811c9dc5
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function sampledChecksum(content: string, limit = 500_000): string | undefined {
  if (!content) return undefined
  if (content.length <= limit) return checksum(content)

  const size = 4096
  const points = [
    0,
    Math.floor(content.length * 0.25),
    Math.floor(content.length * 0.5),
    Math.floor(content.length * 0.75),
    content.length - size,
  ]
  const hashes = points
    .map((point) => {
      const start = Math.max(0, Math.min(content.length - size, point - Math.floor(size / 2)))
      return checksum(content.slice(start, start + size)) ?? ""
    })
    .join(":")
  return `${content.length}:${hashes}`
}

export function chooseTextEncoding(bytes: Uint8Array): string {
  if (bytes.length === 0) return "utf-8"
  const sample = bytes.length > 64 * 1024 ? bytes.subarray(0, 64 * 1024) : bytes
  const candidates = ["utf-8", "gb18030", "gbk", "big5"] as const
  let best: (typeof candidates)[number] = "utf-8"
  let bestScore = Infinity
  for (const enc of candidates) {
    try {
      const t = new TextDecoder(enc, { fatal: false }).decode(sample)
      const bad = (t.match(/\uFFFD/g) || []).length
      if (bad < bestScore) {
        best = enc
        bestScore = bad
        if (bad === 0) break
      }
    } catch {
      // unsupported in runtime
    }
  }
  return best
}

export function bytesToText(bytes: Uint8Array): string {
  if (bytes.length === 0) return ""
  return new TextDecoder(chooseTextEncoding(bytes), { fatal: false }).decode(bytes)
}
