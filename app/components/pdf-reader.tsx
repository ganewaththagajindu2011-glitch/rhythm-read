'use client';

import { useEffect, useRef, useState } from 'react';

export function PdfReader({ src, title }: { src: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const task = pdfjs.getDocument(src);
        const loaded = await task.promise;
        if (!cancelled) {
          setPdf(loaded);
          setPages(loaded.numPages);
          setPage(1);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('The PDF could not be opened in the reader.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!pdf || !canvasRef.current || !shellRef.current) return;
      try {
        const pdfPage = await pdf.getPage(page);
        const base = pdfPage.getViewport({ scale: 1 });
        const available = Math.max(260, shellRef.current.clientWidth - 32);
        const fitScale = available / base.width;
        const viewport = pdfPage.getViewport({ scale: fitScale * scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (e) {
        if (!cancelled) console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, page, scale]);

  function previous() { setPage((p) => Math.max(1, p - 1)); }
  function next() { setPage((p) => Math.min(pages, p + 1)); }

  return (
    <section className="pdf-reader-shell" aria-label={`Reader for ${title}`}>
      <div className="pdf-reader-toolbar">
        <div className="pdf-reader-controls">
          <button className="reader-tool" type="button" onClick={previous} disabled={page <= 1}>Previous</button>
          <span className="reader-page-count">Page {page} / {pages || '—'}</span>
          <button className="reader-tool" type="button" onClick={next} disabled={!pages || page >= pages}>Next</button>
        </div>
        <div className="pdf-reader-controls">
          <button className="reader-tool" type="button" onClick={() => setScale((s) => Math.max(.85, Number((s - .1).toFixed(2))))}>−</button>
          <button className="reader-tool" type="button" onClick={() => setScale((s) => Math.min(1.35, Number((s + .1).toFixed(2))))}>+</button>
        </div>
      </div>
      <div ref={shellRef} className="pdf-reader-page-wrap">
        {loading ? <div className="reader-state">Opening your book…</div> : null}
        {error ? <div className="reader-state reader-error">{error}</div> : null}
        {!error && !loading ? <canvas ref={canvasRef} className="pdf-reader-canvas" /> : null}
      </div>
    </section>
  );
}
