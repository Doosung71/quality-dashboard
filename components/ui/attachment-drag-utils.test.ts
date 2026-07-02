import { describe, it, expect } from 'vitest'
import { shouldDismissDragHighlight } from './attachment-drag-utils'

describe('shouldDismissDragHighlight', () => {
  it('dismisses when relatedTarget is null (left the browser window)', () => {
    const wrapper = { contains: () => false }
    expect(shouldDismissDragHighlight(wrapper, null)).toBe(true)
  })

  it('dismisses when relatedTarget is outside the wrapper', () => {
    const wrapper = { contains: () => false }
    expect(shouldDismissDragHighlight(wrapper, {} as EventTarget)).toBe(true)
  })

  it('keeps highlight when relatedTarget is a child inside the wrapper', () => {
    const wrapper = { contains: () => true }
    expect(shouldDismissDragHighlight(wrapper, {} as EventTarget)).toBe(false)
  })
})
