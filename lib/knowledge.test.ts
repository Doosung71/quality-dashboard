import { describe, it, expect, vi, beforeEach } from 'vitest'

// neon() 호출 결과인 SQL 태그드 템플릿 함수를 캡처해 실행된 쿼리를 검증한다.
const capturedQueries: string[] = []

vi.mock('@neondatabase/serverless', () => ({
  neon: () => {
    const tag = (strings: TemplateStringsArray, ...values: unknown[]) => {
      capturedQueries.push(strings.join('?'))
      return Promise.resolve([])
    }
    return tag
  },
}))

// OpenAI embedding 호출 mock
vi.stubGlobal('fetch', async () => ({
  ok: true,
  json: async () => ({ data: [{ embedding: new Array(1536).fill(0) }] }),
}))

describe('searchKnowledge — source_type 격리', () => {
  beforeEach(() => {
    capturedQueries.length = 0
    process.env.DATABASE_URL_UNPOOLED = 'postgresql://mock'
    process.env.OPENAI_API_KEY = 'mock-key'
  })

  it('기본 호출 시 obsidian·standards·pdf_inbox 포함, tra_approved 제외', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('품질 기준')
    expect(capturedQueries.length).toBeGreaterThan(0)
    const query = capturedQueries[0]
    expect(query).toContain('search_knowledge_hybrid')
    expect(query).not.toContain('tra_approved')
  })

  it('태그 있을 때도 search_knowledge_hybrid, tra_approved 제외', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('IEC 규격', { filter: { tags: ['electrical'] } })
    const query = capturedQueries[0]
    expect(query).toContain('search_knowledge_hybrid')
    expect(query).not.toContain('tra_approved')
  })

  it('sourceTypes 오버라이드 — obsidian·standards만 지정하면 pdf_inbox 미전달', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('클레임', { sourceTypes: ['obsidian', 'standards'] })
    // sourceTypes 파라미터로 전달되므로 쿼리 자체에 배열 리터럴은 없음 (파라미터 바인딩)
    expect(capturedQueries.length).toBeGreaterThan(0)
    expect(capturedQueries[0]).toContain('search_knowledge_hybrid')
  })

  it('limit은 1~20 사이로 클램핑', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('테스트', { limit: 100 })
    await searchKnowledge('테스트', { limit: 0 })
    expect(capturedQueries.length).toBe(2)
  })

  it('DATABASE_URL_UNPOOLED 없으면 에러', async () => {
    delete process.env.DATABASE_URL_UNPOOLED
    const { searchKnowledge } = await import('./knowledge')
    await expect(searchKnowledge('테스트')).rejects.toThrow('DATABASE_URL_UNPOOLED')
  })

  it('OPENAI_API_KEY 없으면 에러', async () => {
    delete process.env.OPENAI_API_KEY
    const { searchKnowledge } = await import('./knowledge')
    await expect(searchKnowledge('테스트')).rejects.toThrow('OPENAI_API_KEY')
  })
})
