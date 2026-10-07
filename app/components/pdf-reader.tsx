'use client';

import { useEffect, useRef, useState } from 'react';

export function PdfReader({ src, title }: { src: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  // 1. PDF Document Load
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    (async () => {
      try {
        setLoading(true);
        setError('');
        setPdf(null);
        setPages(0);
        setPage(1);

        // කලින් loaded PDF එකක් තියෙනවා නම් memory release කරන්න
        if (pdfRef.current) {
          try {
            await pdfRef.current.destroy?.();
          } catch {
            /* noop */
          }
          pdfRef.current = null;
        }

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

        // PDF.js worker
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        loadingTask = pdfjs.getDocument({
          url: src,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
          cMapPacked: true,

          // Low-memory devices වල unnecessary preloading නවත්වයි
          disableAutoFetch: true,
          disableStream: false,
        });

        const loaded = await loadingTask.promise;

        if (cancelled) {
          try {
            await loaded.destroy?.();
          } catch {
            /* noop */
          }
          return;
        }

        pdfRef.current = loaded;
        setPdf(loaded);
        setPages(loaded.numPages || 0);
        setPage(1);
      } catch (e: any) {
        console.error('PDF reader failed to load:', e);

        if (!cancelled) {
          setError(
            'PDF එක load කර ගැනීමට නොහැකි විය. කරුණාකර link එක පරීක්ෂා කරන්න.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;

      try {
        loadingTask?.destroy?.();
      } catch {
        /* noop */
      }

      const currentPdf = pdfRef.current;
      pdfRef.current = null;

      if (currentPdf) {
        try {
          currentPdf.destroy?.();
        } catch {
          /* noop */
        }
      }
    };
  }, [src]);

  // 2. Render Current Page
  useEffect(() => {
    let cancelled = false;
    let renderingTask: any = null;
    let currentPageObj: any = null;

    (async () => {
      if (!pdf || !canvasRef.current || !shellRef.current) return;

      try {
        setRendering(true);
        setError('');

        const pdfPage = await pdf.getPage(page);

        if (cancelled) {
          try {
            pdfPage.cleanup?.();
          } catch {
            /* noop */
          }
          return;
        }

        currentPageObj = pdfPage;

        // Base viewport
        const base = pdfPage.getViewport({ scale: 1 });

        // Phone width එකට fit කරන්න
        const shellWidth =
          containerWidth || shellRef.current.clientWidth || 320;

        const available = Math.max(180, shellWidth - 24);

        const fitScale = available / base.width;

        const viewport = pdfPage.getViewport({
          scale: Math.max(0.5, fitScale * scale),
        });

        const canvas = canvasRef.current;

        const context = canvas.getContext('2d', {
          alpha: false,
          willReadFrequently: false,
        });

        if (!context || cancelled) return;

        /*
         * Mobile PDF performance protection
         *
         * Normal/high-end phones:
         *   max DPR = 1.5
         *
         * Low-end phones:
         *   max DPR = 1
         *
         * Large PDF pages:
         *   total canvas pixels are also capped
         *   so a very large page does not freeze the browser.
         */
        const isMobile =
          typeof window !== 'undefined' &&
          (window.matchMedia('(max-width: 760px)').matches ||
            'ontouchstart' in window);

        const hardwareConcurrency =
          typeof navigator !== 'undefined'
            ? navigator.hardwareConcurrency || 0
            : 0;

        const isLowEndDevice =
          hardwareConcurrency > 0 && hardwareConcurrency <= 4;

        const maxDpr = isMobile
          ? isLowEndDevice
            ? 1
            : 1.25
          : 1.5;

        let dpr = Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          maxDpr
        );

        // Canvas pixel protection
        const maxCanvasPixels = isMobile
          ? 8_000_000
          : 16_000_000;

        const requestedWidth = viewport.width * dpr;
        const requestedHeight = viewport.height * dpr;
        const requestedPixels = requestedWidth * requestedHeight;

        if (requestedPixels > maxCanvasPixels) {
          const safeDpr = Math.sqrt(
            maxCanvasPixels / (viewport.width * viewport.height)
          );

          dpr = Math.min(dpr, Math.max(0.75, safeDpr));
        }

        const renderWidth = Math.max(
          1,
          Math.floor(viewport.width * dpr)
        );

        const renderHeight = Math.max(
          1,
          Math.floor(viewport.height * dpr)
        );

        // Old canvas bitmap එක clear කරන්න
        canvas.width = 1;
        canvas.height = 1;

        canvas.width = renderWidth;
        canvas.height = renderHeight;

        // CSS size = actual page size
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.display = 'block';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';

        // DPR scaling
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        // White background
        context.fillStyle = '#ffffff';
        context.fillRect(
          0,
          0,
          viewport.width,
          viewport.height
        );

        if (cancelled) return;

        renderingTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });

        await renderingTask.promise;
      } catch (e: any) {
        if (
          !cancelled &&
          e?.name !== 'RenderingCancelledException' &&
          e?.name !== 'AbortException'
        ) {
          console.error('PDF page render failed:', e);
          setError('මෙම පිටුව පෙන්වීමට නොහැකි විය.');
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }

        if (
          currentPageObj &&
          typeof currentPageObj.cleanup === 'function'
        ) {
          try {
            currentPageObj.cleanup();
          } catch {
            /* noop */
          }
        }
      }
    })();

    return () => {
      cancelled = true;

      try {
        renderingTask?.cancel?.();
      } catch {
        /* noop */
      }

      if (
        currentPageObj &&
        typeof currentPageObj.cleanup === 'function'
      ) {
        try {
          currentPageObj.cleanup();
        } catch {
          /* noop */
        }
      }
    };
  }, [pdf, page, scale, containerWidth]);

  // 3. Resize Observer
  useEffect(() => {
    const element = shellRef.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (!element) return;

        const width = Math.floor(element.clientWidth);

        setContainerWidth((current) => {
          // Initial value
          if (!current) {
            return width;
          }

          // Tiny width changes ignore කරන්න
          if (Math.abs(current - width) <= 2) {
            return current;
          }

          return width;
        });
      }, 120);
    };

    // Initial width
    setContainerWidth(Math.floor(element.clientWidth));

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(update)
        : null;

    observer?.observe(element);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      observer?.disconnect();
    };
  }, []);

  function previous() {
    setPage((p) => Math.max(1, p - 1));
  }

  function next() {
    setPage((p) => Math.min(pages, p + 1));
  }

  return (
    <section
      className="pdf-reader-shell glass"
      aria-label={`Reader for ${title}`}
    >
      {/* Control Bar */}
      <div className="pdf-reader-toolbar glass">
        <div className="pdf-reader-controls">
          <button
            className="reader-tool"
            type="button"
            onClick={previous}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>

          <span className="reader-page-count">
            Page {page} / {pages || '—'}
          </span>

          <button
            className="reader-tool"
            type="button"
            onClick={next}
            disabled={!pages || page >= pages || loading}
          >
            Next
          </button>
        </div>

        <div className="pdf-reader-controls">
          <button
            className="reader-tool"
            type="button"
            onClick={() =>
              setScale((s) =>
                Math.max(0.8, Number((s - 0.1).toFixed(2)))
              )
            }
            disabled={loading}
          >
            −
          </button>

          <button
            className="reader-tool"
            type="button"
            onClick={() =>
              setScale((s) =>
                Math.min(1.4, Number((s + 0.1).toFixed(2)))
              )
            }
            disabled={loading}
          >
            +
          </button>

          <a
            className="reader-tool reader-open-link"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open PDF
          </a>
        </div>
      </div>

      {/* Reader Main Area */}
      <div
        ref={shellRef}
        className="pdf-reader-page-wrap"
      >
        {loading && (
          <div className="reader-state">
            Opening your book…
          </div>
        )}

        {!loading && rendering && (
          <div className="reader-rendering">
            Rendering page {page}…
          </div>
        )}

        {error ? (
          <div className="reader-state reader-error">
            <strong>{error}</strong>

            <a
              className="btn btn-dark"
              href={src}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open PDF Direct Link
            </a>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="pdf-reader-canvas"
            style={{
              display: loading ? 'none' : 'block',
              maxWidth: '100%',
              height: 'auto',
            }}
            aria-label={`Page ${page} of ${title}`}
          />
        )}
      </div>
    </section>
  );
}