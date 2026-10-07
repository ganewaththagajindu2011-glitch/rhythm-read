'use client';

import { useEffect, useRef, useState } from 'react';

export function PdfReader({ src, title }: { src: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  // 1. PDF Document එක Load කරගැනීම
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    (async () => {
      try {
        setLoading(true);
        setError('');
        setPdf(null);
        setPages(0);

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

        // Low-end phones වල smooth වැඩ කිරීමට CDN Worker එක set කිරීම
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        // Clean TS Options (isEvalSupported වැනි deprecated properties අයින් කර ඇත)
        loadingTask = pdfjs.getDocument({
          url: src,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
          cMapPacked: true,
        });

        const loaded = await loadingTask.promise;
        if (!cancelled) {
          setPdf(loaded);
          setPages(loaded.numPages || 0);
          setPage(1);
        }
      } catch (e) {
        console.error('PDF reader failed to load:', e);
        if (!cancelled) {
          setError('PDF එක load කර ගැනීමට නොහැකි විය. කරුණාකර link එක පරීක්ෂා කරන්න.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, [src]);

  // 2. Canvas එකට අදාළ පිටුව Render කිරීම
  useEffect(() => {
    let cancelled = false;
    let renderingTask: any = null;

    (async () => {
      if (!pdf || !canvasRef.current || !shellRef.current) return;
      try {
        setRendering(true);
        setError('');

        const pdfPage = await pdf.getPage(page);
        const base = pdfPage.getViewport({ scale: 1 });
        const available = Math.max(220, (containerWidth || shellRef.current.clientWidth) - 24);
        const fitScale = available / base.width;
        const viewport = pdfPage.getViewport({ scale: fitScale * scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context || cancelled) return;

        // Display Resolution එකට අනුව Canvas එක adjust කිරීම
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderingTask = pdfPage.render({ canvasContext: context, viewport });
        await renderingTask.promise;
      } catch (e: any) {
        if (!cancelled && e?.name !== 'RenderingCancelledException') {
          console.error('PDF page render failed:', e);
          setError('මෙම පිටුව පෙන්වීමට නොහැකි විය.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderingTask?.cancel?.();
      } catch {
        /* noop */
      }
    };
  }, [pdf, page, scale, containerWidth]);

  // 3. Screen Resize එක Auto Detect කිරීම
  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);

  function previous() {
    setPage((p) => Math.max(1, p - 1));
  }

  function next() {
    setPage((p) => Math.min(pages, p + 1));
  }

  return (
    <section className="pdf-reader-shell glass" aria-label={`Reader for ${title}`}>
      {/* Control Bar */}
      <div className="pdf-reader-toolbar glass">
        <div className="pdf-reader-controls">
          <button className="reader-tool" type="button" onClick={previous} disabled={page <= 1 || loading}>
            Previous
          </button>
          <span className="reader-page-count">
            Page {page} / {pages || '—'}
          </span>
          <button className="reader-tool" type="button" onClick={next} disabled={!pages || page >= pages || loading}>
            Next
          </button>
        </div>
        <div className="pdf-reader-controls">
          <button
            className="reader-tool"
            type="button"
            onClick={() => setScale((s) => Math.max(0.8, Number((s - 0.1).toFixed(2))))}
            disabled={loading}
          >
            −
          </button>
          <button
            className="reader-tool"
            type="button"
            onClick={() => setScale((s) => Math.min(1.4, Number((s + 0.1).toFixed(2))))}
            disabled={loading}
          >
            +
          </button>
          <a className="reader-tool reader-open-link" href={src} target="_blank" rel="noopener noreferrer">
            Open PDF
          </a>
        </div>
      </div>

      {/* Reader Main Area */}
      <div ref={shellRef} className="pdf-reader-page-wrap">
        {loading && <div className="reader-state">Opening your book…</div>}
        {!loading && rendering && <div className="reader-rendering">Rendering page {page}…</div>}

        {error ? (
          <div className="reader-state reader-error">
            <strong>{error}</strong>
            <a className="btn btn-dark" href={src} target="_blank" rel="noopener noreferrer">
              Open PDF Direct Link
            </a>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="pdf-reader-canvas"
            style={{ display: loading ? 'none' : 'block' }}
            aria-label={`Page ${page} of ${title}`}
          />
        )}
      </div>
    </section>
  );
}