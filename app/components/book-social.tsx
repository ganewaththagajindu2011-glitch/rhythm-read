'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { name: string; image?: string | null };
};

type SocialData = {
  counts: { likes: number; dislikes: number };
  userReaction: 'LIKE' | 'DISLIKE' | null;
  comments: Comment[];
};

function formatCommentDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '';
  }
}

export function BookSocial({ slug }: { slug: string }) {
  const { data: session, status } = useSession();
  const [data, setData] = useState<SocialData>({ counts: { likes: 0, dislikes: 0 }, userReaction: null, comments: [] });
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reactionBusy, setReactionBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      const response = await fetch(`/api/books/${encodeURIComponent(slug)}/social`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not load book reactions.');
      setData(payload);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load book reactions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [slug]);

  const firstName = useMemo(() => session?.user?.name?.trim().split(/\s+/)[0] || 'Reader', [session?.user?.name]);

  async function react(reaction: 'LIKE' | 'DISLIKE') {
    if (status !== 'authenticated') return;
    try {
      setReactionBusy(true);
      setError('');
      const response = await fetch(`/api/books/${encodeURIComponent(slug)}/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'reaction', reaction }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update reaction.');
      setData((current) => ({ ...current, counts: payload.counts, userReaction: payload.userReaction }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update reaction.');
    } finally {
      setReactionBusy(false);
    }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (status !== 'authenticated') return;
    const body = comment.trim();
    if (!body || sending) return;

    try {
      setSending(true);
      setError('');
      const response = await fetch(`/api/books/${encodeURIComponent(slug)}/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', body }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not post your comment.');
      setComment('');
      setData((current) => ({ ...current, comments: [payload.comment, ...current.comments].slice(0, 50) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your comment.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="book-social glass" aria-label="Reader reactions and comments">
      <div className="social-head">
        <div>
          <div className="eyebrow">Reader community</div>
          <h2>What readers think.</h2>
          <p>Share your reaction and leave a comment after reading.</p>
        </div>
        <MessageCircle size={22} aria-hidden="true" />
      </div>

      <div className="reaction-row">
        <button
          type="button"
          className={`reaction-btn ${data.userReaction === 'LIKE' ? 'active' : ''}`}
          onClick={() => react('LIKE')}
          disabled={status !== 'authenticated' || reactionBusy}
          title={status === 'authenticated' ? 'Like this book' : 'Sign in to react'}
        >
          <ThumbsUp size={17} /> <span>{data.counts.likes}</span>
        </button>
        <button
          type="button"
          className={`reaction-btn ${data.userReaction === 'DISLIKE' ? 'active' : ''}`}
          onClick={() => react('DISLIKE')}
          disabled={status !== 'authenticated' || reactionBusy}
          title={status === 'authenticated' ? 'Dislike this book' : 'Sign in to react'}
        >
          <ThumbsDown size={17} /> <span>{data.counts.dislikes}</span>
        </button>
        <span className="reaction-note">
          {status === 'authenticated' ? `${firstName}, your reaction is saved to your account.` : 'Sign in with Google to react or comment.'}
        </span>
      </div>

      {status !== 'authenticated' && status !== 'loading' ? (
        <div className="social-login-note">
          <span>Join the Rhythm Read community to leave your thoughts.</span>
          <Link className="btn btn-dark" href={`/login?callbackUrl=${encodeURIComponent(`/book/${slug}`)}`}>Continue with Google</Link>
        </div>
      ) : (
        <form className="comment-form" onSubmit={submitComment}>
          <label htmlFor={`comment-${slug}`} className="sr-only">Your comment</label>
          <textarea
            id={`comment-${slug}`}
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, 1200))}
            maxLength={1200}
            rows={4}
            placeholder="Share a thoughtful comment about this book…"
            required
          />
          <div className="comment-form-bottom">
            <span>{comment.length}/1200</span>
            <button className="btn btn-dark" type="submit" disabled={sending || !comment.trim()}>
              <Send size={15} /> {sending ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      )}

      {error ? <div className="social-error">{error}</div> : null}

      <div className="comments-list">
        <div className="comments-title"><strong>Comments</strong><span>{loading ? 'Loading…' : `${data.comments.length} shown`}</span></div>
        {!loading && data.comments.length === 0 ? (
          <div className="comments-empty">No comments yet. Be the first reader to share a thought.</div>
        ) : null}
        {data.comments.map((item) => (
          <article className="comment-item" key={item.id}>
            <div className="comment-avatar">
              {item.user.image ? <img src={item.user.image} alt="" /> : item.user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="comment-copy">
              <div className="comment-meta"><strong>{item.user.name}</strong><span>{formatCommentDate(item.createdAt)}</span></div>
              <p>{item.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
