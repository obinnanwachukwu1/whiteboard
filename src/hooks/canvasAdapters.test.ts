import { describe, expect, it } from 'vitest'

import {
  adaptCanvasAssignments,
  adaptConversation,
  adaptConversationsPage,
  adaptDiscussionTopics,
  adaptDiscussionView,
} from './canvasAdapters'

describe('canvasAdapters', () => {
  it('normalizes assignment payloads with snake_case and camelCase fields', () => {
    const assignments = adaptCanvasAssignments([
      {
        id: 42,
        name: 'Essay',
        due_at: '2026-02-06T12:00:00Z',
        points_possible: 25,
        html_url: 'https://canvas.example/assignments/42',
        submission: { submitted_at: '2026-02-01T00:00:00Z', workflow_state: 'submitted' },
      },
      {
        _id: '43',
        name: 'Quiz',
        dueAt: '2026-02-08T12:00:00Z',
        pointsPossible: 10,
        htmlUrl: 'https://canvas.example/assignments/43',
      },
      null,
    ])

    expect(assignments).toHaveLength(2)
    expect(assignments[0]).toMatchObject({
      id: 42,
      _id: 42,
      due_at: '2026-02-06T12:00:00Z',
      dueAt: '2026-02-06T12:00:00Z',
      points_possible: 25,
      pointsPossible: 25,
      html_url: 'https://canvas.example/assignments/42',
      htmlUrl: 'https://canvas.example/assignments/42',
      submission: { submitted_at: '2026-02-01T00:00:00Z', workflow_state: 'submitted' },
    })
    expect(assignments[1]).toMatchObject({
      id: '43',
      _id: '43',
      due_at: '2026-02-08T12:00:00Z',
      dueAt: '2026-02-08T12:00:00Z',
      points_possible: 10,
      pointsPossible: 10,
      html_url: 'https://canvas.example/assignments/43',
      htmlUrl: 'https://canvas.example/assignments/43',
    })
  })

  it('normalizes discussion topics and view trees', () => {
    const topics = adaptDiscussionTopics([
      { id: 1, title: 'Week 1', read_state: 'unread', unread_count: 2 },
      { id: '2', title: 'Week 2', read_state: 'read' },
      { title: 'Missing id' },
    ])

    expect(topics).toHaveLength(2)
    expect(topics[0].read_state).toBe('unread')
    expect(topics[1].id).toBe('2')

    const view = adaptDiscussionView({
      participants: [{ id: 100, display_name: 'Alex' }],
      unread_entries: [11, '12'],
      view: [
        {
          id: 11,
          user_id: 100,
          message: 'Top level',
          created_at: '2026-02-06T12:00:00Z',
          replies: [
            {
              id: 12,
              user_id: 101,
              message: 'Reply',
              created_at: '2026-02-06T13:00:00Z',
            },
          ],
        },
      ],
    })

    expect(view.participants).toHaveLength(1)
    expect(view.unread_entries).toEqual([11, '12'])
    expect(view.view).toHaveLength(1)
    expect(view.view[0].replies).toHaveLength(1)
    expect(view.view[0].replies?.[0].message).toBe('Reply')
  })

  it('normalizes conversations from list pages and single payloads', () => {
    const page = adaptConversationsPage({
      items: [
        {
          id: 5,
          workflow_state: 'unread',
          message_count: 1,
          subscribed: true,
          private: true,
          starred: false,
          visible: true,
          participants: [{ id: 9, name: 'Sam' }],
          messages: [{ id: 99, author_id: 9, created_at: '2026-02-06T10:00:00Z', body: 'Hi' }],
        },
      ],
      nextPageUrl: 'https://canvas.example/api/v1/conversations?page=2',
    })

    expect(page.items).toHaveLength(1)
    expect(page.items[0].workflow_state).toBe('unread')
    expect(page.items[0].participants?.[0].name).toBe('Sam')
    expect(page.nextPageUrl).toBe('https://canvas.example/api/v1/conversations?page=2')

    const conversation = adaptConversation(
      {
        workflow_state: 'read',
        message_count: 0,
        subscribed: false,
        private: false,
        starred: false,
        visible: true,
      },
      'fallback-id',
    )

    expect(conversation?.id).toBe('fallback-id')
    expect(conversation?.workflow_state).toBe('read')
  })
})
