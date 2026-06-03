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

  it('태그 없이 호출 시 source_type IN (obsidian, standards) 필터 포함', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('품질 기준')
    expect(capturedQueries.length).toBeGreaterThan(0)
    const query = capturedQueries[0]
    expect(query).toContain("source_type IN ('obsidian', 'standards')")
    expect(query).not.toContain('tra_approved')
  })

  it('태그 있을 때도 source_type IN (obsidian, standards) 필터 포함', async () => {
    const { searchKnowledge } = await import('./knowledge')
    await searchKnowledge('IEC 규격', { filter: { tags: ['electrical'] } })
    const query = capturedQueries[0]
    expect(query).toContain("source_type IN ('obsidian', 'standards')")
    expect(query).not.toContain('tra_approved')
  })

  it('limit은 1~20 사이로 클램핑', async () => {
    const { searchKnowledge } = await import('./knowledge')
    // limit 초과: 내부적으로 safeLimit = 20으로 clamp
    await searchKnowledge('테스트', { limit: 100 })
    // limit 미만: safeLimit = 1로 clamp
    await searchKnowledge('테스트', { limit: 0 })
    // 두 쿼리 모두 실행됨 (에러 없음)
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
