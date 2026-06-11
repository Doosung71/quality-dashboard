export interface BoardPost {
  id: string
  title: string
  content: string
  category: string
  pinned: boolean
}

export interface PinnedNotice {
  id: string
  title: string
  content: string
}

export const ACK_KEY = (id: string) => `noticeAck-${id}`

export function getUnacknowledgedNotice(
  posts: BoardPost[],
  getItem: (key: string) => string | null,
): PinnedNotice | null {
  const pinned = posts.find(p => p.category === "NOTICE" && p.pinned)
  if (!pinned) return null
  if (getItem(ACK_KEY(pinned.id))) return null
  return { id: pinned.id, title: pinned.title, content: pinned.content }
}
