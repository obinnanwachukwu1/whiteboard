import { describe, expect, it } from 'vitest'
import {
  filterVisibleCourses,
  normalizeCourseId,
  toHiddenCourseIdSet,
  updateHiddenCourseIds,
} from './courseVisibility'

describe('courseVisibility', () => {
  it('normalizes ids to strings', () => {
    expect(normalizeCourseId(101)).toBe('101')
    expect(normalizeCourseId('202')).toBe('202')
  })

  it('builds hidden set as normalized string ids', () => {
    const hidden = toHiddenCourseIdSet([1, '2', 3])
    expect(hidden.has('1')).toBe(true)
    expect(hidden.has('2')).toBe(true)
    expect(hidden.has('3')).toBe(true)
    expect(hidden.has('4')).toBe(false)
  })

  it('filters visible courses regardless of id type mix', () => {
    const courses = [
      { id: 1, name: 'Math' },
      { id: '2', name: 'History' },
      { id: 3, name: 'Science' },
    ]
    const visible = filterVisibleCourses(courses, ['1', 2])
    expect(visible.map((c) => String(c.id))).toEqual(['3'])
  })

  it('adds and removes hidden ids consistently', () => {
    const hidden = updateHiddenCourseIds([1], '2', true)
    expect(hidden).toEqual(['1', '2'])

    const unhidden = updateHiddenCourseIds(hidden, 1, false)
    expect(unhidden).toEqual(['2'])
  })
})
