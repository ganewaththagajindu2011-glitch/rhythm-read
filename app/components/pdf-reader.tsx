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
  const [nativeFallback, setNativeFallback] = useState(false);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task: any = null;

    (async () => {
      try {
        setLoading(true);
        setError('');
        setNativeFallback(false);
        setPdf(null);
        setPages(0);

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        task = pdfjs.getDocument({
          url: src,
          isEvalSupported: false,
          enableXfa: false,
          stopAtErrors: false,
          disableAutoFetch: false,
          disableStream: false,
          rangeChunkSize: 128 * 1024,
          useWorkerFetch: false,
          useWasm: false,
        } as any);

        const loaded = await task.promise;
        if (!cancelled) {
          setPdf(loaded);
          setPages(loaded.numPages || 0);
          setPage(1);
        }
      } catch (e) {
        console.error('PDF reader failed', e);
        if (!cancelled) {
          setError('This browser could not render the book in the built-in reader.');
          setNativeFallback(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try { task?.destroy?.(); } catch { /* noop */ }
    };
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    let renderingTask: any = null;

    (async () => {
      if (!pdf || !canvasRef.current || !shellRef.current || nativeFallback) return;
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
      } catch (e) {
        if (!cancelled) {
          console.error('PDF page render failed', e);
          setError('This page could not be rendered on this device.');
          setNativeFallback(true);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      try { renderingTask?.cancel?.(); } catch { /* noop */ }
    };
  }, [pdf, page, scale, containerWidth, nativeFallback]);

  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;
    const update = () => setContainerWidth(element.clientWidth);
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    return () => observer?.disconnect();
  }, []);

  function previous() { setPage((p) => Math.max(1, p - 1)); }
  function next() { setPage((p) => Math.min(pages, p + 1)); }

  return (
    <section className="pdf-reader-shell glass" aria-label={`Reader for ${title}`}>
      <div className="pdf-reader-toolbar glass">
        <div className="pdf-reader-controls">
          <button className="reader-tool" type="button" onClick={previous} disabled={page <= 1 || nativeFallback}>Previous</button>
          <span className="reader-page-count">Page {page} / {pages || '—'}</span>
          <button className="reader-tool" type="button" onClick={next} disabled={!pages || page >= pages || nativeFallback}>Next</button>
        </div>
        <div className="pdf-reader-controls">
          <button className="reader-tool" type="button" onClick={() => setScale((s) => Math.max(.8, Number((s - .1).toFixed(2))))} disabled={nativeFallback}>−</button>
          <button className="reader-tool" type="button" onClick={() => setScale((s) => Math.min(1.4, Number((s + .1).toFixed(2))))} disabled={nativeFallback}>+</button>
          <button className="reader-tool" type="button" onClick={() => setNativeFallback((v) => !v)}>
            {nativeFallback ? 'Built-in reader' : 'Device viewer'}
          </button>
          <a className="reader-tool reader-open-link" href={src} target="_blank" rel="noopener noreferrer">Open PDF</a>
        </div>
      </div>

      <div ref={shellRef} className="pdf-reader-page-wrap">
        {loading ? <div className="reader-state">Opening your book…</div> : null}
        {!loading && rendering ? <div className="reader-rendering">Rendering page {page}…</div> : null}

        {nativeFallback ? (
          <div className="reader-native-wrap">
            <iframe className="reader-native-frame" src={src} title={`${title} PDF`} loading="eager" />
            <div className="reader-native-caption glass">
              <strong>Using your device PDF viewer</strong>
              <span>This fallback is designed for phones and browsers that do not fully support the built-in reader.</span>
              <a className="btn btn-dark" href={src} target="_blank" rel="noopener noreferrer">Open full PDF</a>
            </div>
          </div>
        ) : error ? (
          <div className="reader-state reader-error">
            <strong>{error}</strong>
            <button className="btn btn-dark" type="button" onClick={() => setNativeFallback(true)}>Use device viewer</button>
          </div>
        ) : !loading ? (
          <canvas ref={canvasRef} className="pdf-reader-canvas" aria-label={`Page ${page} of ${title}`} />
        ) : null}
      </div>
    </section>
  );
}
