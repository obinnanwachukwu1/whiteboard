import { describe, expect, it } from 'vitest'
import { computeResolvedTabs, getExtraCourseLinks } from './courseTabs'

describe('getExtraCourseLinks', () => {
  it('returns only unsupported or external tabs', () => {
    const tabs = [
      {
        id: 'announcements',
        label: 'Announcements',
        type: 'internal',
        html_url: 'https://canvas.test/courses/1/announcements',
      },
      {
        id: 'external_tool',
        label: 'Zoom',
        type: 'external',
        html_url: 'https://canvas.test/courses/1/external_tools/2',
      },
      {
        id: 'quizzes',
        label: 'Quizzes',
        type: 'internal',
        html_url: 'https://canvas.test/courses/1/quizzes',
      },
      {
        id: 'links',
        label: 'Links',
        type: 'internal',
        html_url: 'https://canvas.test/courses/1/links',
      },
    ]

    const extra = getExtraCourseLinks(tabs)
    expect(extra.map((t) => t.id)).toEqual(['external_tool', 'quizzes'])
  })
})

describe('computeResolvedTabs', () => {
  it('omits discussions when not present', () => {
    const info = { default_view: 'modules', syllabus_body: '' }
    const tabs = [
      {
        id: 'announcements',
        label: 'Announcements',
        type: 'internal',
        html_url: 'https://canvas.test/courses/1/announcements',
      },
    ]

    const resolved = computeResolvedTabs(info as any, tabs as any, false)
    const keys = resolved.map((t) => t.key)
    expect(keys).toContain('announcements')
    expect(keys).toContain('modules')
    expect(keys).toContain('assignments')
    expect(keys).toContain('grades')
    expect(keys).not.toContain('discussions')
  })

  it('adds links when extra links exist', () => {
    const info = { default_view: 'modules', syllabus_body: '' }
    const tabs = [
      {
        id: 'external_tool',
        label: 'Zoom',
        type: 'external',
        html_url: 'https://canvas.test/courses/1/external_tools/2',
      },
    ]

    const resolved = computeResolvedTabs(info as any, tabs as any, false)
    const keys = resolved.map((t) => t.key)
    expect(keys).toContain('links')
  })
})
