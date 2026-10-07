'use client';

import { useEffect, useRef } from 'react';

function sessionId() {
  const key = 'rhythm-read-session-id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  window.sessionStorage.setItem(key, value);
  return value;
}

export function BookAnalytics({ slug, trackView = true }: { slug: string; trackView?: boolean }) {
  const started = useRef(Date.now());
  const idRef = useRef<string>('');

  useEffect(() => {
    idRef.current = sessionId();
    const id = idRef.current;

    if (trackView) {
      void fetch('/api/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, sessionId: id }),
        keepalive: true,
      }).catch(() => {});
    }

    const heartbeat = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - started.current) / 1000));
      if (seconds < 5) return;
      void fetch('/api/analytics/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, sessionId: id, seconds }),
        keepalive: true,
      }).catch(() => {});
    };

    const timer = window.setInterval(heartbeat, 15000);
    window.addEventListener('pagehide', heartbeat);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', heartbeat);
      heartbeat();
    };
  }, [slug, trackView]);

  return null;
}
