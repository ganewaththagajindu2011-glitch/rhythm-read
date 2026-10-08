'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

type PageRatioMap = Record<number, number>;

type RenderTaskEntry = {
  task: any;
  token: number;
};

export function PdfReader({ src, title }: { src: string; title: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderTasksRef = useRef<Map<number, RenderTaskEntry>>(new Map());
  const renderTokensRef = useRef<Map<number, number>>(new Map());
  const renderedScaleRef = useRef<Map<number, number>>(new Map());
  const visiblePagesRef = useRef<Set<number>>(new Set([1]));
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [pages, setPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageRatios, setPageRatios] = useState<PageRatioMap>({});
  const [showControls, setShowControls] = useState(true);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);

  const isZoomed = scale > 1.01;

  const cancelRender = useCallback((pageNumber: number) => {
    const entry = renderTasksRef.current.get(pageNumber);

    if (entry?.task) {
      try {
        entry.task.cancel?.();
      } catch {
        /* noop */
      }
    }

    renderTasksRef.current.delete(pageNumber);
    renderTokensRef.current.set(
      pageNumber,
      (renderTokensRef.current.get(pageNumber) || 0) + 1,
    );
  }, []);

  const cancelAllRenders = useCallback(() => {
    const pageNumbers = Array.from(renderTasksRef.current.keys());
    for (const pageNumber of pageNumbers) cancelRender(pageNumber);
    renderTasksRef.current.clear();
  }, [cancelRender]);

  const getCanvasProtection = useCallback(() => {
    const isMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia('(max-width: 760px)').matches ||
        'ontouchstart' in window);

    const hardwareConcurrency =
      typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 0 : 0;

    const isLowEnd = hardwareConcurrency > 0 && hardwareConcurrency <= 4;

    return {
      maxDpr: isMobile ? (isLowEnd ? 1 : 1.25) : 1.5,
      maxPixels: isMobile ? 8_000_000 : 16_000_000,
    };
  }, []);

  const getPageViewport = useCallback(
    async (pdfPageObj: any) => {
      const base = pdfPageObj.getViewport({ scale: 1 });
      const rawWidth =
        containerWidth || scrollRef.current?.clientWidth || 320;

      // Account for reader padding + possible scrollbar. Keep every page inside
      // the phone viewport at 100% zoom and only allow horizontal overflow when
      // the user deliberately zooms in.
      const available = Math.max(180, rawWidth - 30);
      const fitScale = available / Math.max(1, base.width);

      return pdfPageObj.getViewport({
        scale: Math.max(0.5, fitScale * scale),
      });
    },
    [containerWidth, scale],
  );

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdf || pageNumber < 1 || pageNumber > pages) return;

      const canvas = canvasRefs.current.get(pageNumber);
      const pageWrap = pageRefs.current.get(pageNumber);
      if (!canvas || !pageWrap) return;

      const existingScale = renderedScaleRef.current.get(pageNumber);
      if (existingScale === scale && canvas.width > 1 && canvas.height > 1) {
        return;
      }

      cancelRender(pageNumber);
      const token = (renderTokensRef.current.get(pageNumber) || 0) + 1;
      renderTokensRef.current.set(pageNumber, token);
      setRendering(true);

      try {
        const pdfPageObj = await pdf.getPage(pageNumber);
        const viewport = await getPageViewport(pdfPageObj);

        const ratio = viewport.height / Math.max(1, viewport.width);
        setPageRatios((current) => {
          if (Math.abs((current[pageNumber] || 0) - ratio) < 0.0005) {
            return current;
          }
          return { ...current, [pageNumber]: ratio };
        });

        if (renderTokensRef.current.get(pageNumber) !== token) {
          pdfPageObj.cleanup?.();
          return;
        }

        const protection = getCanvasProtection();
        let dpr = Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          protection.maxDpr,
        );

        const requestedPixels = viewport.width * viewport.height * dpr * dpr;

        if (requestedPixels > protection.maxPixels) {
          const safeDpr = Math.sqrt(
            protection.maxPixels / Math.max(1, viewport.width * viewport.height),
          );
          dpr = Math.min(dpr, Math.max(0.65, safeDpr));
        }

        const renderWidth = Math.max(1, Math.floor(viewport.width * dpr));
        const renderHeight = Math.max(1, Math.floor(viewport.height * dpr));

        canvas.width = 1;
        canvas.height = 1;
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.display = 'block';

        pageWrap.style.width = `${viewport.width}px`;
        pageWrap.style.height = `${viewport.height}px`;
        pageWrap.style.minHeight = `${viewport.height}px`;
        pageWrap.dataset.rendered = 'true';

        const context = canvas.getContext('2d', {
          alpha: false,
          willReadFrequently: false,
        });

        if (!context) {
          throw new Error('Canvas 2D context unavailable');
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, viewport.width, viewport.height);

        const renderTask = pdfPageObj.render({
          canvasContext: context,
          viewport,
        });

        renderTasksRef.current.set(pageNumber, { task: renderTask, token });
        await renderTask.promise;

        if (renderTokensRef.current.get(pageNumber) !== token) {
          pdfPageObj.cleanup?.();
          return;
        }

        renderedScaleRef.current.set(pageNumber, scale);
        renderTasksRef.current.delete(pageNumber);
        setRendering(false);
        pdfPageObj.cleanup?.();
      } catch (e: any) {
        renderTasksRef.current.delete(pageNumber);

        if (
          e?.name !== 'RenderingCancelledException' &&
          e?.name !== 'AbortException'
        ) {
          console.error(`PDF page ${pageNumber} render failed:`, e);
          setError('මෙම පිටුව පෙන්වීමට නොහැකි විය.');
        }
      }
    },
    [cancelRender, getCanvasProtection, getPageViewport, pdf, pages, scale],
  );

  // 1. Load PDF with worker fallbacks for mobile / browser differences.
  useEffect(() => {
    let cancelled = false;
    let loadingTask: any = null;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError('');
        setPdf(null);
        setPages(0);
        setCurrentPage(1);
        setPageRatios({});
        visiblePagesRef.current = new Set([1]);
        renderedScaleRef.current.clear();
        renderTokensRef.current.clear();
        cancelAllRenders();
        canvasRefs.current.clear();
        pageRefs.current.clear();

        const currentPdf = pdfRef.current;
        pdfRef.current = null;

        if (currentPdf) {
          try {
            await currentPdf.destroy?.();
          } catch {
            /* noop */
          }
        }

        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const version = pdfjs.version;
        const workers = [
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`,
          `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        ];

        let loaded: any = null;
        let lastError: any = null;

        // First try normal worker mode using a couple of public CDN mirrors.
        for (const workerSrc of workers) {
          if (cancelled) return;

          try {
            pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

            loadingTask = pdfjs.getDocument({
              url: src,
              cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/cmaps/`,
              cMapPacked: true,
              disableAutoFetch: false,
              disableStream: false,
              rangeChunkSize: 65_536,
            });

            loaded = await loadingTask.promise;
            break;
          } catch (workerError) {
            lastError = workerError;

            try {
              loadingTask?.destroy?.();
            } catch {
              /* noop */
            }

            loadingTask = null;
          }
        }

        // Last-resort fallback for browsers / networks that cannot start the
        // PDF.js worker. This is slower, but much more compatible.
        if (!loaded && !cancelled) {
          try {
            loadingTask = pdfjs.getDocument({
              url: src,
              cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/cmaps/`,
              cMapPacked: true,
              disableAutoFetch: false,
              disableStream: false,
              rangeChunkSize: 65_536,
              isEvalSupported: false,
              disableWorker: true,
            } as any);

            loaded = await loadingTask.promise;
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }

        if (!loaded) {
          throw lastError || new Error('PDF could not be loaded.');
        }

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
        setCurrentPage(1);
      } catch (e: any) {
        console.error('PDF reader failed to load:', e);

        if (!cancelled) {
          setError(
            'PDF එක load කර ගැනීමට නොහැකි විය. කරුණාකර link එක පරීක්ෂා කරන්න.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;

      try {
        loadingTask?.destroy?.();
      } catch {
        /* noop */
      }

      cancelAllRenders();

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
  }, [cancelAllRenders, src]);

  // 2. Observe visible / nearby pages so long PDFs remain performant.
  useEffect(() => {
    if (!pdf || !pages || !scrollRef.current) return;

    const root = scrollRef.current;
    let observer: IntersectionObserver | null = null;
    let raf = 0;

    const setup = () => {
      observer = new IntersectionObserver(
        (entries) => {
          let bestPage = currentPage;
          let bestRatio = 0;

          for (const entry of entries) {
            const pageNumber = Number(
              (entry.target as HTMLElement).dataset.page || 0,
            );
            if (!pageNumber) continue;

            if (entry.isIntersecting) {
              visiblePagesRef.current.add(pageNumber);
              void renderPage(pageNumber);
            } else {
              visiblePagesRef.current.delete(pageNumber);
            }

            if (entry.intersectionRatio > bestRatio) {
              bestRatio = entry.intersectionRatio;
              bestPage = pageNumber;
            }
          }

          if (bestPage !== currentPage && bestRatio > 0.25) {
            setCurrentPage(bestPage);
          }
        },
        {
          root,
          rootMargin: '1200px 0px 1200px 0px',
          threshold: [0.05, 0.1, 0.25, 0.5, 0.75, 1],
        },
      );

      for (const [pageNumber, element] of pageRefs.current.entries()) {
        element.dataset.page = String(pageNumber);
        observer.observe(element);
      }

      visiblePagesRef.current.add(1);
      void renderPage(1);

      if (pages >= 2) {
        visiblePagesRef.current.add(2);
        void renderPage(2);
      }
    };

    raf = window.requestAnimationFrame(setup);

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [currentPage, pages, pdf, renderPage, scale]);

  // 3. Keep reader width current on resize / rotation.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const update = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        const width = Math.floor(element.clientWidth);
        setContainerWidth((current) =>
          !current || Math.abs(current - width) > 2 ? width : current,
        );
      }, 120);
    };

    setContainerWidth(Math.floor(element.clientWidth));

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;

    observer?.observe(element);
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // 4. Re-render visible pages when zoom changes.
  useEffect(() => {
    if (!pdf || !pages) return;

    renderedScaleRef.current.clear();
    cancelAllRenders();

    for (const pageNumber of visiblePagesRef.current) {
      void renderPage(pageNumber);
    }
  }, [cancelAllRenders, pages, pdf, renderPage, scale]);

  // 5. Native fullscreen state.
  useEffect(() => {
    const onFullscreenChange = () => {
      setNativeFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    const element = shellRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        setFallbackFullscreen(false);
        return;
      }

      if (element.requestFullscreen) {
        await element.requestFullscreen();
        setFallbackFullscreen(false);
      } else {
        setFallbackFullscreen((value) => !value);
      }
    } catch {
      setFallbackFullscreen((value) => !value);
    }
  };

  const scrollByOneViewport = (direction: 1 | -1) => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollBy({
      top: direction * Math.max(240, element.clientHeight * 0.82),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (
        event.key === 'PageDown' ||
        event.key === 'ArrowDown' ||
        event.key === ' '
      ) {
        event.preventDefault();
        scrollByOneViewport(1);
      } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
        event.preventDefault();
        scrollByOneViewport(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (event.key === 'End') {
        event.preventDefault();
        const element = scrollRef.current;
        element?.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth',
        });
      } else if (event.key === 'Escape') {
        setShowControls(true);

        if (document.fullscreenElement) {
          void document.exitFullscreen?.();
        } else {
          setFallbackFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const setCanvasRef = (pageNumber: number, node: HTMLCanvasElement | null) => {
    if (node) canvasRefs.current.set(pageNumber, node);
    else canvasRefs.current.delete(pageNumber);
  };

  const setPageRef = (pageNumber: number, node: HTMLDivElement | null) => {
    if (node) pageRefs.current.set(pageNumber, node);
    else pageRefs.current.delete(pageNumber);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    tapStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (!start) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved <= 8) setShowControls((value) => !value);
  };

  const defaultRatio = pageRatios[1] || 1.414;
  const availableWidth = Math.max(180, (containerWidth || 320) - 30);

  return (
    <section
      ref={shellRef}
      className={`pdf-reader-shell glass${fallbackFullscreen ? ' is-reader-fullscreen-fallback' : ''}`}
      aria-label={`Continuous reader for ${title}`}
    >
      <div
        className={`pdf-reader-toolbar${showControls ? ' is-visible' : ' is-hidden'}`}
      >
        <div className="pdf-reader-controls">
          <span className="reader-page-count">
            Page {currentPage} / {pages || '—'}
          </span>
        </div>

        <div className="pdf-reader-controls">
          <button
            className="reader-tool"
            type="button"
            onClick={() =>
              setScale((value) => Math.max(0.8, Number((value - 0.1).toFixed(2))))
            }
            disabled={loading}
            aria-label="Zoom out"
          >
            −
          </button>

          <span className="reader-zoom-value">{Math.round(scale * 100)}%</span>

          <button
            className="reader-tool"
            type="button"
            onClick={() =>
              setScale((value) => Math.min(2.5, Number((value + 0.1).toFixed(2))))
            }
            disabled={loading}
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            className="reader-tool"
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={
              nativeFullscreen || fallbackFullscreen
                ? 'Exit full screen'
                : 'Enter full screen'
            }
          >
            ⛶
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`pdf-reader-page-wrap${isZoomed ? ' is-zoomed' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        style={{ touchAction: isZoomed ? 'pan-x pan-y' : 'pan-y' }}
      >
        {loading && <div className="reader-state">Opening your book…</div>}

        {!loading && rendering && (
          <div className="reader-rendering">Preparing pages…</div>
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
          !loading && (
            <div className="pdf-continuous-document">
              {Array.from({ length: pages }, (_, index) => {
                const pageNumber = index + 1;
                const ratio = pageRatios[pageNumber] || defaultRatio;
                const estimatedWidth = availableWidth * scale;
                const estimatedHeight = estimatedWidth * ratio;

                return (
                  <div
                    key={pageNumber}
                    ref={(node) => setPageRef(pageNumber, node)}
                    className="pdf-continuous-page"
                    data-page={pageNumber}
                    style={{
                      width: `${estimatedWidth}px`,
                      minHeight: `${estimatedHeight}px`,
                    }}
                    aria-label={`Page ${pageNumber} of ${title}`}
                  >
                    <canvas
                      ref={(node) => setCanvasRef(pageNumber, node)}
                      className="pdf-continuous-canvas"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </section>
  );
}
