'use client';

import { useEffect } from 'react';

export function AdSlot({ placement = 'reader' }: { placement?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;

  useEffect(() => {
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      // AdSense may not be loaded yet; it will retry on the next render.
    }
  }, []);

  return (
    <div className="ad-slot" data-ad-placement={placement} aria-label="Advertisement">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight: 90 }}
        data-ad-client={client}
        data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT || '0000000000'}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
