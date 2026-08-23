import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { ForumPost } from '../types/domain';
import { EmptyState, Loading } from './StateViews';
import { IconMessage } from './icons';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function authorName(author: ForumPost['author']): string {
  return author ? `${author.firstName} ${author.lastName}` : 'Someone';
}

/** A simple per-course discussion board: post a question, reply to it. One flat level
 * of replies, no likes/reactions/nesting — deliberately not social-media-style.
 * Shared between the lecturer's offering page and the student's course workspace since
 * both sides read/write the exact same course-scoped thread. */
export function ForumSection({ offeringId }: { offeringId: string }) {
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<ForumPost[]>(`/course-offerings/${offeringId}/forum-posts`)
      .then(setPosts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load the discussion'));
  }, [offeringId]);

  useEffect(() => {
    load();
  }, [load]);

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosting(true);
    setError(null);
    try {
      await api.post(`/course-offerings/${offeringId}/forum-posts`, { title: newTitle, body: newBody });
      setNewTitle('');
      setNewBody('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const sendReply = async (postId: string) => {
    const body = (replyDrafts[postId] ?? '').trim();
    if (!body) return;
    setReplyingId(postId);
    setError(null);
    try {
      await api.post(`/forum-posts/${postId}/replies`, { body });
      setReplyDrafts({ ...replyDrafts, [postId]: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reply');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <div>
      {error && <p className="error" role="alert">{error}</p>}

      <form className="inline-form" onSubmit={createPost} aria-label="Start a discussion">
        <label style={{ flex: 1 }}>
          Title
          <input
            placeholder="What's your question or topic?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
        </label>
        <label style={{ flex: 2 }}>
          Message
          <input
            placeholder="Add some detail…"
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={posting}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </form>

      <div style={{ marginTop: 'var(--space-4)' }}>
        {!posts ? (
          <Loading label="Loading discussion…" />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<IconMessage />}
            title="No discussion yet"
            description="Be the first to ask a question or start a conversation about this course."
          />
        ) : (
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {posts.map((post) => (
              <div key={post.id} className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)' }}>{post.title}</h3>
                <p style={{ color: 'var(--color-ink-faint)', fontSize: 'var(--text-sm)' }}>
                  {authorName(post.author)} · {formatWhen(post.createdAt)}
                </p>
                <p style={{ color: 'var(--color-ink-soft)' }}>{post.body}</p>

                {post.replies.length > 0 && (
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: 'var(--space-3) 0 0',
                      padding: 'var(--space-3) 0 0',
                      borderTop: '1px solid var(--color-border)',
                      display: 'grid',
                      gap: 'var(--space-3)',
                    }}
                  >
                    {post.replies.map((r) => (
                      <li key={r.id} style={{ paddingLeft: 'var(--space-4)' }}>
                        <p style={{ color: 'var(--color-ink-faint)', fontSize: 'var(--text-sm)' }}>
                          {authorName(r.author)} · {formatWhen(r.createdAt)}
                        </p>
                        <p>{r.body}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <input
                    aria-label={`Reply to ${post.title}`}
                    placeholder="Write a reply…"
                    value={replyDrafts[post.id] ?? ''}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [post.id]: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={replyingId === post.id}
                    onClick={() => void sendReply(post.id)}
                  >
                    {replyingId === post.id ? 'Sending…' : 'Reply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
