import { del, get } from "@vercel/blob"

export async function deleteBlob(url: string): Promise<void> {
  await del(url).catch(() => {})
}

export async function readBlobBuffer(url: string): Promise<Buffer | null> {
  const result = await get(url, { access: "private", useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null

  const chunks: Uint8Array[] = []
  const reader = result.stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
