"use client";

import {
  CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Expand, LayoutTemplate, Minimize2, Minus, Plus } from "lucide-react";

import { HarvardTemplate } from "@/components/templates/HarvardTemplate";
import { ModernTechTemplate } from "@/components/templates/ModernTechTemplate";
import { AtsOptimizedTemplate } from "@/components/templates/AtsOptimizedTemplate";
import { ProfessionalTemplate } from "@/components/templates/ProfessionalTemplate";
import type { ResumeData, WorkExperience } from "@/components/templates/types";
import { buildMachineReadableResumeText, normalizeResumeData } from "@/lib/resume-data";
import { PDF_MACHINE_READABLE_END, PDF_MACHINE_READABLE_START } from "@/lib/pdf-machine-readable";
import { cn } from "@/lib/utils";

type ResumeBuilderProps = {
  data: ResumeData;
};

export type ResumeBuilderHandle = {
  print: () => void;
};

type TemplateKey =
  | "harvard"
  | "modern-tech"
  | "minimalist"
  | "ats-optimized"
  | "professional";

type TemplateOption = {
  key: TemplateKey;
  label: string;
  subtitle: string;
};

const templateOptions: TemplateOption[] = [
  { key: "harvard", label: "经典结构", subtitle: "通用稳妥，适合大多数岗位" },
  { key: "ats-optimized", label: "ATS 单栏", subtitle: "关键词清晰，机器筛选友好" },
  { key: "professional", label: "专业商务", subtitle: "简洁专业，适合白领与职能岗" },
  { key: "modern-tech", label: "现代双栏", subtitle: "信息密度高，适合互联网岗位" },
];

const previewScaleSteps = [0.8, 0.9, 1, 1.1, 1.2, 1.35];
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PREVIEW_SAFE_PADDING_PX = 48;

function encodeMachineReadableText(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function renderTemplateNode(template: TemplateKey, data: ResumeData) {
  if (template === "ats-optimized") {
    return <AtsOptimizedTemplate data={data} />;
  }

  if (template === "professional") {
    return <ProfessionalTemplate data={data} />;
  }

  if (template === "modern-tech") {
    return <ModernTechTemplate data={data} />;
  }

  return <HarvardTemplate data={data} />;
}

function TemplateOptionCard({
  option,
  active,
  onClick,
}: {
  option: TemplateOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group min-w-[220px] rounded-[16px] border px-4 py-3 text-left transition",
        active
          ? "border-[#d7b08b] bg-[#fff7ef] text-slate-900 shadow-[0_10px_24px_rgba(184,92,44,0.10)]"
          : "border-stone-300 bg-white text-slate-700 hover:border-stone-400 hover:bg-stone-50",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-semibold leading-5">{option.label}</p>
          {active ? <span className="shrink-0 rounded-full bg-[#f3dfcf] px-2 py-1 text-[11px] font-semibold text-[#9a5a33]">已选择</span> : null}
        </div>
        <p className={cn("mt-1 line-clamp-2 text-xs leading-5", active ? "text-[#9a5a33]" : "text-slate-500")}>{option.subtitle}</p>
      </div>
    </button>
  );
}

function getExperienceRank(duration: string): number {
  const normalized = duration.toLowerCase();
  if (/(present|current|now|至今)/.test(normalized)) {
    return Number.MAX_SAFE_INTEGER;
  }

  const years = duration.match(/(19|20)\d{2}/g);
  if (years && years.length > 0) {
    return Number(years[years.length - 1]);
  }

  return 0;
}

function sortExperienceByDateDesc(items: WorkExperience[]): WorkExperience[] {
  return [...items].sort((a, b) => getExperienceRank(b.duration) - getExperienceRank(a.duration));
}

export const ResumeBuilder = forwardRef<ResumeBuilderHandle, ResumeBuilderProps>(function ResumeBuilder({ data }, ref) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("harvard");
  const [previewScale, setPreviewScale] = useState(1);
  const [fitWidthScale, setFitWidthScale] = useState(1);
  const [contentFitScale, setContentFitScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const resumeScaleTargetRef = useRef<HTMLDivElement>(null);
  const previewScrollPositionRef = useRef<{ top: number; left: number } | null>(null);

  const normalizedData = useMemo<ResumeData>(
    () =>
      normalizeResumeData({
        ...data,
        work_experience: sortExperienceByDateDesc(data.work_experience ?? []),
      }),
    [data],
  );

  const templateNode = useMemo(() => renderTemplateNode(selectedTemplate, normalizedData), [normalizedData, selectedTemplate]);

  const syncFitWidthScale = useCallback(() => {
    const viewportNode = previewViewportRef.current;
    if (!viewportNode) {
      setFitWidthScale(1);
      return 1;
    }

    const availableWidth = viewportNode.clientWidth - PREVIEW_SAFE_PADDING_PX;
    const nextScale = availableWidth > 0 ? availableWidth / A4_WIDTH_PX : 1;
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;

    setFitWidthScale(safeScale);
    return safeScale;
  }, []);

  const syncContentFitScale = useCallback(() => {
    const scaleTargetNode = resumeScaleTargetRef.current;
    if (!scaleTargetNode) {
      setContentFitScale(1);
      return 1;
    }

    const width = scaleTargetNode.scrollWidth;
    const height = scaleTargetNode.scrollHeight;
    const nextScale = Math.min(1, A4_WIDTH_PX / Math.max(width, 1), A4_HEIGHT_PX / Math.max(height, 1));
    const safeScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;

    setContentFitScale(safeScale);
    return safeScale;
  }, []);

  const preparePrintViewport = useCallback(() => {
    const viewportNode = previewViewportRef.current;
    if (!viewportNode) {
      return;
    }

    previewScrollPositionRef.current = {
      top: viewportNode.scrollTop,
      left: viewportNode.scrollLeft,
    };

    viewportNode.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const restorePrintViewport = useCallback(() => {
    const viewportNode = previewViewportRef.current;
    const snapshot = previewScrollPositionRef.current;
    if (!viewportNode || !snapshot) {
      return;
    }

    viewportNode.scrollTo({ top: snapshot.top, left: snapshot.left, behavior: "auto" });
    previewScrollPositionRef.current = null;
  }, []);

  useEffect(() => {
    const viewportNode = previewViewportRef.current;
    if (!viewportNode) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      syncFitWidthScale();
    });

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncFitWidthScale);
      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", syncFitWidthScale);
      };
    }

    const observer = new ResizeObserver(() => {
      syncFitWidthScale();
    });

    observer.observe(viewportNode);
    window.addEventListener("resize", syncFitWidthScale);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", syncFitWidthScale);
    };
  }, [isFullscreen, syncFitWidthScale]);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      syncContentFitScale();
    });

    const timeoutId = window.setTimeout(() => {
      syncContentFitScale();
    }, 80);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeoutId);
    };
  }, [selectedTemplate, normalizedData, syncContentFitScale]);

  useEffect(() => {
    const onBeforePrint = () => {
      preparePrintViewport();
      syncContentFitScale();
    };

    const onAfterPrint = () => {
      restorePrintViewport();
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [preparePrintViewport, restorePrintViewport, syncContentFitScale]);

  useEffect(() => {
    if (!isFullscreen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const handlePrint = useCallback(() => {
    const sourceNode = resumeScaleTargetRef.current;
    if (!sourceNode) {
      return;
    }

    const nextContentFitScale = syncContentFitScale();
    const machineReadablePayload = encodeMachineReadableText(buildMachineReadableResumeText(normalizedData));
    const headMarkup = Array.from(document.head.querySelectorAll("style, link[rel='stylesheet']"))
      .map((node) => node.outerHTML)
      .join("\n");

    const printDocument = `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="utf-8" />
          <title>Resume PDF</title>
          ${headMarkup}
          <style>
            @page {
              size: A4;
              margin: 0;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm;
              height: 297mm;
              overflow: hidden !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body * {
              visibility: visible !important;
            }

            .pdf-shell,
            .pdf-shell * {
              visibility: visible !important;
            }

            .pdf-shell {
              position: relative;
              width: 794px;
              height: 1123px;
              overflow: hidden;
              background: #ffffff;
            }

            .pdf-scale {
              position: absolute;
              inset: 0;
              width: 794px;
              height: 1123px;
              transform-origin: left top;
              transform: scale(${nextContentFitScale});
            }

            .pdf-scale > * {
              margin: 0 !important;
            }

            .pdf-machine-readable {
              position: absolute;
              inset: 0;
              overflow: hidden;
              white-space: pre-wrap;
              word-break: break-all;
              font-size: 1px;
              line-height: 1;
              color: transparent;
              opacity: 0.01;
              pointer-events: none;
              user-select: text;
            }
          </style>
        </head>
        <body>
          <div class="pdf-shell">
            <div class="pdf-scale">${sourceNode.innerHTML}</div>
            <div class="pdf-machine-readable">${PDF_MACHINE_READABLE_START}
${machineReadablePayload}
${PDF_MACHINE_READABLE_END}</div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 200);
    };

    const frameWindow = iframe.contentWindow;
    const frameDocument = frameWindow?.document;

    if (!frameWindow || !frameDocument) {
      cleanup();
      preparePrintViewport();
      window.setTimeout(() => window.print(), 80);
      return;
    }

    frameDocument.open();
    frameDocument.write(printDocument);
    frameDocument.close();

    const triggerPrint = () => {
      const pendingImages = Array.from(frameDocument.images).filter((image) => !image.complete);

      if (pendingImages.length === 0) {
        window.setTimeout(() => {
          frameWindow.focus();
          frameWindow.print();
        }, 120);
        return;
      }

      let resolvedCount = 0;
      const finish = () => {
        resolvedCount += 1;
        if (resolvedCount < pendingImages.length) {
          return;
        }

        window.setTimeout(() => {
          frameWindow.focus();
          frameWindow.print();
        }, 120);
      };

      pendingImages.forEach((image) => {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    };

    frameWindow.addEventListener("afterprint", cleanup, { once: true });

    if (frameDocument.readyState === "complete") {
      triggerPrint();
      return;
    }

    iframe.addEventListener("load", triggerPrint, { once: true });
  }, [normalizedData, preparePrintViewport, syncContentFitScale]);

  const effectivePreviewScale = fitWidthScale * previewScale;
  const canZoomOut = previewScale > previewScaleSteps[0];
  const canZoomIn = previewScale < previewScaleSteps[previewScaleSteps.length - 1];

  const changePreviewScale = useCallback((direction: -1 | 1) => {
    setPreviewScale((current) => {
      const currentIndex = previewScaleSteps.findIndex((step) => step >= current - 0.001 && step <= current + 0.001);
      const safeIndex = currentIndex === -1 ? previewScaleSteps.indexOf(1) : currentIndex;
      const nextIndex = Math.min(previewScaleSteps.length - 1, Math.max(0, safeIndex + direction));
      return previewScaleSteps[nextIndex];
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      print: handlePrint,
    }),
    [handlePrint],
  );

  return (
    <section
      className={cn(
        "space-y-2",
        isFullscreen && "fixed inset-4 z-[70] overflow-hidden rounded-[32px] border border-stone-300/80 bg-[rgba(247,241,233,0.98)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.22)] backdrop-blur",
      )}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden;
          }

          .resume-print-root,
          .resume-print-root * {
            visibility: visible;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .resume-print-root {
            position: absolute;
            inset: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
          }

          .resume-print-stage {
            position: absolute !important;
            inset: 0 !important;
            display: block !important;
            min-width: 0 !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .resume-print-canvas {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-width: 210mm !important;
            min-height: 297mm !important;
          }

          .resume-print-paper {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            overflow: hidden !important;
            transform: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }

          .resume-print-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
          }

          .resume-print-scale-target {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            margin: 0 !important;
            transform-origin: left top !important;
            transform: scale(var(--resume-content-scale, 1)) !important;
          }
        }
      `}</style>

      <div className="no-print rounded-[20px] border border-stone-300/80 bg-[#fffdfa] px-3 py-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <LayoutTemplate className="h-3.5 w-3.5 text-[#b85c2c]" />
              模板切换
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">切换版式后，右侧预览和 PDF 导出会同步更新。内容超出一页时会自动压缩到单页。</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center rounded-full border border-stone-300 bg-white p-1 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
              <button
                type="button"
                onClick={() => changePreviewScale(-1)}
                disabled={!canZoomOut}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="缩小预览"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[64px] text-center text-sm font-semibold text-slate-700">{Math.round(effectivePreviewScale * 100)}%</span>
              <button
                type="button"
                onClick={() => changePreviewScale(1)}
                disabled={!canZoomIn}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="放大预览"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-stone-400 hover:bg-stone-50"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              {isFullscreen ? "退出全屏" : "全屏预览"}
            </button>
          </div>
        </div>

        <div className="mt-2 w-full sm:hidden">
          <label className="sr-only" htmlFor="template-selector">
            选择模板
          </label>
          <select
            id="template-selector"
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value as TemplateKey)}
            className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#d97745] focus:ring-4 focus:ring-[#f3d5c2]/60"
          >
            {templateOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} · {option.subtitle}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2 hidden gap-2 overflow-x-auto pb-1 sm:flex sm:flex-nowrap">
          {templateOptions.map((option) => {
            const active = option.key === selectedTemplate;
            return (
              <TemplateOptionCard
                key={option.key}
                option={option}
                active={active}
                onClick={() => setSelectedTemplate(option.key)}
              />
            );
          })}
        </div>
      </div>

      <div
        ref={previewViewportRef}
        className={cn(
          "resume-print-root overflow-auto rounded-[30px] border border-stone-300/80 bg-[linear-gradient(180deg,#f3eadf_0%,#ede3d6_100%)] shadow-[0_18px_55px_rgba(15,23,42,0.08)] print:bg-white print:p-0",
          isFullscreen ? "h-[calc(100vh-11rem)]" : "max-h-[calc(100vh-11rem)]",
        )}
      >
        <div className="resume-print-stage flex min-h-full min-w-full items-start justify-center p-4">
          <div
            className="resume-print-canvas mx-auto shrink-0"
            style={{
              width: `${A4_WIDTH_PX * effectivePreviewScale}px`,
              height: `${A4_HEIGHT_PX * effectivePreviewScale}px`,
              minWidth: `${A4_WIDTH_PX * effectivePreviewScale}px`,
              minHeight: `${A4_HEIGHT_PX * effectivePreviewScale}px`,
            }}
          >
            <div
              className="resume-print-paper origin-top-left overflow-hidden rounded-[22px] border border-stone-300 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.14)] transition-transform duration-200 print:rounded-none print:border-0 print:shadow-none"
              style={{ width: `${A4_WIDTH_PX}px`, height: `${A4_HEIGHT_PX}px`, transform: `scale(${effectivePreviewScale})` }}
            >
              <div className="resume-print-content h-full w-full overflow-hidden">
                <div
                  ref={resumeScaleTargetRef}
                  className="resume-print-scale-target h-full w-full"
                  style={{
                    width: `${A4_WIDTH_PX}px`,
                    height: `${A4_HEIGHT_PX}px`,
                    transform: `scale(${contentFitScale})`,
                    "--resume-content-scale": `${contentFitScale}`,
                  } as CSSProperties}
                >
                  {templateNode}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
