import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfCanvasViewerProps {
  url: string;
  className?: string;
}

export function PdfCanvasViewer({ url, className }: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidth(Math.floor(rect.width));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setDoc(null);
    setError(null);

    let cancelled = false;
    const loadingTask = getDocument(url);

    loadingTask.promise
      .then((loaded) => {
        if (cancelled) return;
        setDoc(loaded);
      })
      .catch((err) => {
        console.error("PDF.js load error:", err);
        if (cancelled) return;
        setError("Não foi possível renderizar o PDF neste navegador.");
      });

    return () => {
      cancelled = true;
      try {
        loadingTask.destroy();
      } catch {
        // ignore
      }
    };
  }, [url]);

  const pageWidth = useMemo(() => {
    // 32px ~= padding interno do viewer
    return Math.max(320, containerWidth - 32);
  }, [containerWidth]);

  return (
    <div ref={containerRef} className={cn("w-full h-full overflow-auto", className)}>
      {!doc || containerWidth === 0 ? (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando pré-visualização…</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full p-6">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="mx-auto w-full p-4 space-y-4">
          {Array.from({ length: doc.numPages }, (_, i) => (
            <PdfPageCanvas key={i + 1} doc={doc} pageNumber={i + 1} pageWidth={pageWidth} />
          ))}
        </div>
      )}
    </div>
  );
}

function PdfPageCanvas({
  doc,
  pageNumber,
  pageWidth,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  pageWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel?: () => void } | null = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    (async () => {
      try {
        const page = await doc.getPage(pageNumber);

        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = pageWidth / baseViewport.width;
        const dpr = window.devicePixelRatio || 1;

        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

        renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        await (renderTask as any).promise;

        page.cleanup();
      } catch (err) {
        // Cancelamento é esperado em re-render/resize
        if ((err as any)?.name !== "RenderingCancelledException") {
          console.error("PDF.js render error:", err);
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {
        // ignore
      }
    };
  }, [doc, pageNumber, pageWidth]);

  return (
    <div className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        className="max-w-full bg-background rounded-md shadow-sm border border-border"
      />
    </div>
  );
}
