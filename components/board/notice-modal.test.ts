import { describe, it, expect } from 'vitest'
import { ACK_KEY, getUnacknowledgedNotice } from './notice-modal.utils'

const makePost = (overrides: Partial<{
  id: string; title: string; content: string; category: string; pinned: boolean
}> = {}) => ({
  id: 'post-1',
  title: '공지 제목',
  content: '공지 내용',
  category: 'NOTICE',
  pinned: true,
  ...overrides,
})

describe('ACK_KEY', () => {
  it('올바른 localStorage 키를 반환한다', () => {
    expect(ACK_KEY('abc123')).toBe('noticeAck-abc123')
  })
})

describe('getUnacknowledgedNotice', () => {
  const noAck = () => null

  it('핀된 NOTICE가 없으면 null 반환', () => {
    expect(getUnacknowledgedNotice([], noAck)).toBeNull()
  })

  it('핀되지 않은 NOTICE는 무시', () => {
    expect(getUnacknowledgedNotice([makePost({ pinned: false })], noAck)).toBeNull()
  })

  it('GENERAL 카테고리는 무시', () => {
    expect(getUnacknowledgedNotice([makePost({ category: 'GENERAL' })], noAck)).toBeNull()
  })

  it('이미 확인한 공지는 null 반환', () => {
    const post = makePost()
    const alreadyAcked = (key: string) => key === ACK_KEY(post.id) ? '1' : null
    expect(getUnacknowledgedNotice([post], alreadyAcked)).toBeNull()
  })

  it('미확인 NOTICE는 공지 객체 반환', () => {
    const post = makePost()
    const result = getUnacknowledgedNotice([post], noAck)
    expect(result).toEqual({ id: post.id, title: post.title, content: post.content })
  })

  it('여러 게시글 중 첫 번째 핀된 NOTICE만 반환', () => {
    const posts = [
      makePost({ id: 'p1', title: '첫 번째 공지', pinned: true }),
      makePost({ id: 'p2', title: '두 번째 공지', pinned: true }),
    ]
    const result = getUnacknowledgedNotice(posts, noAck)
    expect(result?.id).toBe('p1')
  })

  it('다른 공지가 확인되어도 새 공지는 표시', () => {
    const post = makePost({ id: 'new-post' })
    const ackedOtherPost = (key: string) => key === ACK_KEY('old-post') ? '1' : null
    expect(getUnacknowledgedNotice([post], ackedOtherPost)).not.toBeNull()
  })
})
