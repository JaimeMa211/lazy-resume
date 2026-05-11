"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

import type { ResumeData, ResumePersona } from "@/components/templates/types";
import {
  getCurrentAccountMeta,
  getCurrentSession,
  subscribeAuthChange,
  type AccountMeta,
  type AuthSession,
} from "@/lib/auth-client";
import { createStoredResumeDraft, readResumeDraftWorkspace, writeResumeDraftWorkspace } from "@/lib/resume-data";
import { cn } from "@/lib/utils";

type ExperienceItem = {
  company: string;
  role: string;
  details: string[];
};

type OptimizeResponse = {
  match_score: number;
  optimizations: string[];
  new_experiences: ExperienceItem[];
};

type PreviewExperience = {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
};

type ResumePreviewData = {
  professionalSummary: string;
  skills: string[];
  workExperience: PreviewExperience[];
};

type ExtractedProfileData = {
  name: string;
  contact: string;
  education: ResumeData["education"];
};

type HighlightPart = {
  text: string;
  added: boolean;
};

type HighlightedAchievement = {
  originalText: string;
  parts: HighlightPart[];
};

type HighlightedExperience = PreviewExperience & {
  highlightedAchievements: HighlightedAchievement[];
};

function extractProfileData(resumeText: string): ExtractedProfileData {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const name = lines.find((line) => line.length <= 30 && !line.includes("@") && !/\d{6,}/.test(line)) ?? "候选人";
  const contact =
    lines.find((line) => line.includes("@") || /(\+?\d[\d\s-]{6,})/.test(line)) ??
    "联系方式待补充 | 邮箱待补充 | 手机待补充";

  const educationKeywords = /(university|college|school|academy|学院|大学|学校|硕士|本科|博士|master|bachelor|phd)/i;
  const educationLines = lines.filter((line) => educationKeywords.test(line)).slice(0, 2);

  const education =
    educationLines.length > 0
      ? educationLines.map((line, index) => {
          const durationMatch = line.match(/(19|20)\d{2}\s*[-~至到]+\s*((19|20)\d{2}|至今|Present|present)?/);
          return {
            school: line.length > 28 ? `${line.slice(0, 28)}...` : line,
            major: "专业待补充",
            degree: "学历待补充",
            duration: durationMatch?.[0] ?? (index === 0 ? "最近教育经历" : "教育经历"),
          };
        })
      : [
          {
            school: "教育经历待补充",
            major: "专业待补充",
            degree: "学历待补充",
            duration: "时间待补充",
          },
        ];

  return { name, contact, education };
}

function buildTemplateResumeData(previewData: ResumePreviewData, profileData: ExtractedProfileData): ResumeData {
  return {
    persona: "experienced",
    personal_info: {
      name: profileData.name,
      contact: profileData.contact,
    },
    professional_summary: previewData.professionalSummary,
    skills: [
      {
        category: "核心技能",
        items: previewData.skills.length > 0 ? previewData.skills : ["技能待补充"],
      },
    ],
    internships: [],
    work_experience: previewData.workExperience.map((item) => ({
      company: item.company,
      role: item.role,
      duration: item.duration,
      achievements: item.achievements.length > 0 ? item.achievements : ["经历要点待补充"],
    })),
    education: profileData.education,
    campus_experience: [],
    projects: [],
    awards: [],
    certifications: [],
    languages: [],
  };
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tokenizeForDiff(text: string): string[] {
  return text.match(/([A-Za-z0-9.+#/-]+|[\u4E00-\u9FFF]|[^\u4E00-\u9FFFA-Za-z0-9\s]|\s+)/g) ?? [];
}

function filterComparableTokens(tokens: string[]): string[] {
  return tokens.filter((token) => !/^\s+$/.test(token) && !/^[^\u4E00-\u9FFFA-Za-z0-9]+$/.test(token));
}

function buildLcsMatrix(sourceTokens: string[], targetTokens: string[]): number[][] {
  const matrix = Array.from({ length: sourceTokens.length + 1 }, () => Array(targetTokens.length + 1).fill(0));

  for (let i = 1; i <= sourceTokens.length; i += 1) {
    for (let j = 1; j <= targetTokens.length; j += 1) {
      if (sourceTokens[i - 1] === targetTokens[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

function computeSimilarityScore(sourceText: string, targetText: string): number {
  const sourceTokens = filterComparableTokens(tokenizeForDiff(sourceText));
  const targetTokens = filterComparableTokens(tokenizeForDiff(targetText));

  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }

  const matrix = buildLcsMatrix(sourceTokens, targetTokens);
  const lcsLength = matrix[sourceTokens.length][targetTokens.length];

  return lcsLength / Math.max(sourceTokens.length, targetTokens.length);
}

function findBestMatchingLine(targetText: string, sourceLines: string[]): string {
  let bestLine = "";
  let bestScore = 0;

  for (const line of sourceLines) {
    const score = computeSimilarityScore(line, targetText);
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  return bestScore >= 0.2 ? bestLine : "";
}

function buildHighlightedParts(sourceText: string, targetText: string): HighlightPart[] {
  if (!sourceText.trim()) {
    return [{ text: targetText, added: true }];
  }

  const sourceTokens = tokenizeForDiff(sourceText);
  const targetTokens = tokenizeForDiff(targetText);
  const matrix = buildLcsMatrix(sourceTokens, targetTokens);
  const keptTargetIndexes = new Set<number>();

  let i = sourceTokens.length;
  let j = targetTokens.length;

  while (i > 0 && j > 0) {
    if (sourceTokens[i - 1] === targetTokens[j - 1]) {
      keptTargetIndexes.add(j - 1);
      i -= 1;
      j -= 1;
    } else if (matrix[i - 1][j] >= matrix[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  const parts: HighlightPart[] = [];
  for (let index = 0; index < targetTokens.length; index += 1) {
    const token = targetTokens[index];
    const added = !keptTargetIndexes.has(index) && !/^\s+$/.test(token);
    const previous = parts[parts.length - 1];

    if (previous && previous.added === added) {
      previous.text += token;
    } else {
      parts.push({ text: token, added });
    }
  }

  return parts;
}

function buildHighlightedExperiences(workExperience: PreviewExperience[], resumeText: string): HighlightedExperience[] {
  const sourceLines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 6);

  return workExperience.map((job) => ({
    ...job,
    highlightedAchievements: job.achievements.map((achievement) => {
      const originalText = findBestMatchingLine(achievement, sourceLines);
      return {
        originalText,
        parts: buildHighlightedParts(originalText, achievement),
      };
    }),
  }));
}

function buildPreviewData(result: OptimizeResponse, jdText: string): ResumePreviewData {
  const skillCandidates = [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "SQL",
    "Go",
    "Docker",
    "Kubernetes",
    "云原生",
    "微服务",
    "项目管理",
    "跨团队协作",
  ];

  const lowerJd = jdText.toLowerCase();
  const skills = skillCandidates.filter((skill) => lowerJd.includes(skill.toLowerCase())).slice(0, 10);

  const workExperience = result.new_experiences.slice(0, 3).map((item, index) => ({
    company: item.company || "公司待补充",
    role: item.role || "岗位待补充",
    duration: index === 0 ? "最近经历" : "过往经历",
    achievements: item.details.length > 0 ? item.details.slice(0, 4) : ["经历要点待补充"],
  }));

  return {
    professionalSummary:
      result.optimizations.slice(0, 2).join("；") || "已生成优化建议，建议继续补充量化成果和业务结果。",
    skills,
    workExperience,
  };
}

function matchScoreTitle(score: number): string {
  if (score >= 80) return "匹配度很高，简历表现不错";
  if (score >= 60) return "整体匹配较好，仍有优化空间";
  return "匹配度偏低，建议继续完善";
}

function matchScoreDescription(score: number): string {
  if (score >= 80) {
    return "核心技能与项目成果已经较好地对齐到目标岗位的主要要求。";
  }

  if (score >= 60) {
    return "基础匹配已经建立，下一步应继续强化量化成果与业务影响。";
  }

  return "建议继续补充与岗位高度相关的项目经历、结果数据和关键词。";
}

function inferPersonaFromResumeText(resumeText: string, result: OptimizeResponse | null): ResumePersona {
  const hasStudentSignals = /(在校|应届|毕业生|学生|本科|硕士|博士|大一|大二|大三|大四|研一|研二)/.test(resumeText);
  const hasInternSignals = /实习/.test(resumeText);
  const hasWorkSignals = /(工作经历|任职|就职|至今|负责人|公司|项目负责|主导)/.test(resumeText);

  if (hasStudentSignals && hasInternSignals) {
    return "intern";
  }

  if (hasStudentSignals) {
    return "graduate";
  }

  if (hasWorkSignals) {
    return "experienced";
  }

  if (result?.new_experiences.some((item) => !/实习/.test(`${item.role}${item.company}`))) {
    return "experienced";
  }

  return hasInternSignals ? "intern" : "graduate";
}

export default function ResumeOptimizerWorkspace() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [isPreparingBuilder, setIsPreparingBuilder] = useState(false);
  const [mobileTab, setMobileTab] = useState<"input" | "result">("input");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [accountMeta, setAccountMeta] = useState<AccountMeta | null>(null);

  useEffect(() => {
    return subscribeAuthChange(() => {
      setSession(getCurrentSession());
      setAccountMeta(getCurrentAccountMeta());
    });
  }, []);

  const canSubmit = useMemo(() => resumeText.trim() && jdText.trim() && !isSubmitting && !isParsingPdf, [resumeText, jdText, isSubmitting, isParsingPdf]);
  const previewData = useMemo(() => (result ? buildPreviewData(result, jdText) : null), [result, jdText]);
  const extractedProfileData = useMemo(() => extractProfileData(resumeText), [resumeText]);
  const templateResumeData = useMemo(() => (previewData ? buildTemplateResumeData(previewData, extractedProfileData) : null), [previewData, extractedProfileData]);
  const highlightedWorkExperience = useMemo(
    () => (previewData ? buildHighlightedExperiences(previewData.workExperience, resumeText) : []),
    [previewData, resumeText],
  );
  const canContinueToBuilder = !!templateResumeData && !!result && !isPreparingBuilder;

  async function parsePdfFile(file: File) {
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");
    if (!isPdf) {
      throw new Error("请上传 PDF 文件（.pdf）。");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/parse-pdf", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as { text?: string; error?: string };
    if (!response.ok) {
      throw new Error(data.error || "PDF 解析失败");
    }

    const text = data.text?.trim() ?? "";
    if (!text) {
      throw new Error("未从 PDF 中提取到文本，请检查文件内容。");
    }

    setUploadedFileName(file.name);
    setResumeText(text);
  }

  async function handlePdfUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsParsingPdf(true);

    try {
      await parsePdfFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 解析失败");
    } finally {
      setIsParsingPdf(false);
      event.target.value = "";
    }
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || isParsingPdf || isSubmitting) return;

    setError(null);
    setIsParsingPdf(true);
    try {
      await parsePdfFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF 解析失败");
    } finally {
      setIsParsingPdf(false);
    }
  }

  async function handleOptimize() {
    if (!canSubmit) return;

    if (accountMeta && accountMeta.monthlyQuota !== null && accountMeta.monthlyUsed >= accountMeta.monthlyQuota) {
      setError(`本月优化次数已用完（${accountMeta.monthlyUsed}/${accountMeta.monthlyQuota}次），请升级会员获取更多额度。`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/optimize-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jdText }),
      });
      const data = (await response.json()) as OptimizeResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "简历优化失败");
      }
      setResult(data);
      setAccountMeta((prev) => prev ? { ...prev, monthlyUsed: prev.monthlyUsed + 1 } : null);
      setMobileTab("result"); // 移动端自动切换到结果面板
    } catch (err) {
      setError(err instanceof Error ? err.message : "简历优化失败");
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinueInBuilder() {
    if (!result || !templateResumeData) return;

    setIsPreparingBuilder(true);
    setError(null);

    try {
      const nextDraft = createStoredResumeDraft({
        ...templateResumeData,
        persona: inferPersonaFromResumeText(resumeText, result),
      });
      const workspace = readResumeDraftWorkspace(window.localStorage);
      writeResumeDraftWorkspace(window.localStorage, {
        drafts: [nextDraft, ...workspace.drafts.filter((item) => item.id !== nextDraft.id)],
        activeDraftId: nextDraft.id,
      });
      window.location.href = "/builder";
      return;
    } catch {
      setError("进入制作页失败，请稍后重试。");
    } finally {
      setIsPreparingBuilder(false);
    }
  }

  const score = clampScore(result?.match_score ?? 0);

  return (
    <div className="mx-auto w-full max-w-7xl text-slate-900">
      {/* 移动端 Tab 切换栏 */}
      <div className="mx-6 mb-4 flex gap-1 rounded-[18px] border border-stone-200 bg-stone-100/80 p-1 lg:hidden">
        {(["input", "result"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition",
              mobileTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            )}
          >
            {tab === "input" ? "输入简历 / JD" : `优化结果${result ? " ✓" : ""}`}
          </button>
        ))}
      </div>

      <div className="grid items-stretch gap-6 px-6 pb-14 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside className={cn("flex h-full flex-col gap-6 rounded-[30px] border border-stone-300/70 bg-[rgba(255,253,250,0.9)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]", mobileTab !== "input" && "hidden lg:flex")}>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI 简历优化器</h1>
          <p className="mt-2 text-sm text-slate-500">上传 PDF 简历或直接粘贴文本，再输入 JD，系统会生成更适合岗位的表达版本。</p>
        </div>

        <section>
          <label className="mb-3 block text-sm font-semibold text-slate-700">原始简历</label>
          <input id="resume-upload" type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
          <label
            htmlFor="resume-upload"
            onDrop={handleDrop}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!isParsingPdf && !isSubmitting) setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            className={cn(
              "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed px-4 py-6 text-center transition",
              isDragActive ? "border-[#b85c2c] bg-[#f7efe6]" : "border-stone-300 bg-[#f8f4ed] hover:border-stone-400",
            )}
          >
            <p className="text-sm font-medium text-slate-700">拖拽 PDF 到这里，或点击上传</p>
            <p className="text-xs text-slate-500">仅支持 .pdf 格式</p>
            {uploadedFileName ? <p className="text-xs font-medium text-[#b85c2c]">当前文件：{uploadedFileName}</p> : null}
          </label>
          {isParsingPdf ? <p className="mt-2 text-xs text-slate-500">正在解析 PDF...</p> : null}
        </section>

        <div aria-hidden="true" className="flex items-center gap-3 text-[12px] text-[#999]">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="shrink-0 font-medium tracking-[0.18em]">或 (OR)</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <section>
          <label className="mb-3 block text-sm font-semibold text-slate-700" htmlFor="resume-text">简历文本</label>
          <textarea id="resume-text" rows={6} value={resumeText} onChange={(event) => setResumeText(event.target.value)} className="min-h-[120px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#b85c2c]" placeholder="如果不上传 PDF，也可以直接粘贴简历文本。" />
        </section>

        <section>
          <label className="mb-3 block text-sm font-semibold text-slate-700" htmlFor="jd-input">职位描述 JD</label>
          <textarea id="jd-input" rows={6} value={jdText} onChange={(event) => setJdText(event.target.value)} className="min-h-[120px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#b85c2c]" placeholder="粘贴目标岗位 JD。" />
        </section>

        {error ? <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        {session && accountMeta && accountMeta.monthlyQuota !== null ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            本月剩余额度：{Math.max(0, accountMeta.monthlyQuota - accountMeta.monthlyUsed)} / {accountMeta.monthlyQuota} 次
          </p>
        ) : null}

        <button type="button" onClick={handleOptimize} disabled={!canSubmit} className={cn("mt-auto w-full rounded-full px-4 py-3 font-semibold text-white transition", canSubmit ? "bg-[#111827] shadow-[0_14px_30px_rgba(17,24,39,0.18)] hover:opacity-90" : "cursor-not-allowed bg-slate-300")}>
          {isSubmitting ? "正在优化中..." : "优化简历"}
        </button>
      </aside>

      <main className={cn("flex min-h-[720px] flex-col overflow-hidden rounded-[30px] border border-stone-300/70 bg-[#FAFAFB] shadow-[0_18px_45px_rgba(15,23,42,0.06)]", mobileTab !== "result" && "hidden lg:flex")}>
        <div className="border-b border-stone-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">简历优化预览</p>
              <p className="mt-1 text-sm text-slate-500">可直接查看优化建议，并把结果继续带入制作页编辑。</p>
            </div>
            <button type="button" onClick={handleContinueInBuilder} disabled={!canContinueToBuilder} className={cn("rounded-full border px-4 py-2 text-sm font-semibold transition", canContinueToBuilder ? "border-[#b85c2c] text-[#b85c2c] hover:bg-[#f7efe6]" : "cursor-not-allowed border-stone-200 text-slate-400")}>
              {isPreparingBuilder ? "正在准备制作页..." : "继续去制作页"}
            </button>
          </div>
        </div>

        <div className="flex h-full flex-1 flex-col p-6">
          {!result || !previewData ? (
            <div className="flex h-full flex-1 flex-col">
              <div className="flex flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-stone-200 bg-[#f8f4ed] px-6 py-16 text-center">
                <p className="text-base font-semibold text-slate-700">暂无优化结果</p>
                <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">上传简历并填写 JD 后，系统会生成匹配度、优化建议和可继续编辑的制作页内容。</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="rounded-[24px] border border-stone-200 bg-[#f8f4ed] px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{matchScoreTitle(score)}</p>
                    <p className="mt-2 text-sm text-slate-500">{matchScoreDescription(score)}</p>
                  </div>
                  <div className="rounded-full bg-[#b85c2c] px-4 py-2 text-lg font-bold text-white">{score}%</div>
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-900">AI 优化摘要</h2>
                <ul className="space-y-2 rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-900">
                  {result.optimizations.slice(0, 4).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-900">优化后的经历表达</h2>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">高亮部分为 AI 新增或改写内容</span>
                </div>
                {highlightedWorkExperience.length > 0 ? (
                  <div className="space-y-4">
                    {highlightedWorkExperience.map((job) => (
                      <article key={`${job.company}-${job.role}`} className="rounded-[24px] border border-stone-200 bg-white/80 px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{job.role}</h3>
                            <p className="mt-1 text-xs text-slate-500">{job.company} | {job.duration}</p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-3 text-sm text-slate-700">
                          {job.highlightedAchievements.map((achievement, index) => (
                            <li key={`${job.company}-${job.role}-${index}`} className="rounded-[18px] bg-[#fcfaf7] px-4 py-3 leading-7">
                              <div>
                                <span className="mr-2 text-slate-400">•</span>
                                {achievement.parts.map((part, partIndex) => (
                                  <span
                                    key={`${job.company}-${job.role}-${index}-${partIndex}`}
                                    className={part.added ? "rounded-md bg-[#fde7bf] px-1 py-0.5 text-slate-900" : undefined}
                                  >
                                    {part.text}
                                  </span>
                                ))}
                              </div>
                              {achievement.originalText ? (
                                <p className="mt-2 text-xs leading-6 text-slate-400">原文参考：{achievement.originalText}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-stone-200 bg-white px-5 py-4 text-sm leading-7 text-slate-500">
                    暂未提取到结构化的优化经历表达。已兼容更多 AI 返回字段，请重新点击一次“优化简历”查看最新结果。
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}




