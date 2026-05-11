"use client";

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Copy,
  Download,
  FileStack,
  GraduationCap,
  Sparkle,
  Layers3,
  Languages,
  Medal,
  PencilLine,
  Plus,
  Rocket,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
  Trash2,
  UserRound,
} from "lucide-react";

import { ResumeBuilder, type ResumeBuilderHandle } from "@/components/ResumeBuilder";
import { ResumePhoto } from "@/components/templates/ResumePhoto";
import type {
  Award,
  CampusExperience,
  Certification,
  Education,
  InternshipExperience,
  LanguageSkill,
  ProfessionalSkillGroup,
  ProjectExperience,
  ResumeData,
  ResumeModuleId,
  ResumePersona,
  WorkExperience,
} from "@/components/templates/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  buildProfessionalSkills,
  createEmptyResumeData,
  createStoredResumeDraft,
  createStarterResumeData,
  getResumeDraftTitle,
  normalizeResumeData,
  parseMultilineText,
  readResumeDraftWorkspace,
  type StoredResumeDraft,
  toMultilineText,
  writeResumeDraftWorkspace,
} from "@/lib/resume-data";
import { RESUME_MODULE_CATALOG, getModuleLabel, getResumePersonaDefinition, getVisibleResumeModules } from "@/lib/resume-personas";
import { cn } from "@/lib/utils";

type RoleExperienceTextField = "company" | "role" | "duration";
type EducationTextField = "school" | "major" | "degree" | "duration";
type CampusTextField = "organization" | "role" | "duration";
type ProjectTextField = "name" | "role" | "duration";
type AwardTextField = "name" | "issuer" | "date" | "detail";
type CertificationTextField = "name" | "issuer" | "date";
type LanguageTextField = "name" | "proficiency";
type SkillGroupTextField = "category";
type WorkspaceSectionId = ResumeModuleId;

type SectionMeta = {
  id: WorkspaceSectionId;
  title: string;
  description: string;
  badge: string;
  icon: typeof Sparkles;
};

type SegmentAiAssistantProps = {
  sectionTitle: string;
  fieldLabel: string;
  persona: ResumePersona;
  value: string;
  multiline?: boolean;
  disabled?: boolean;
  onApply: (value: string) => void;
};

type SegmentOptimizeMode = "concise" | "results";

const inputClassName =
  "box-border h-11 w-full rounded-2xl border border-stone-300/80 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d97745] focus:ring-4 focus:ring-[#f3d5c2]/60";

const personaOrder: ResumePersona[] = ["intern", "graduate", "experienced"];
const MAX_RESUME_PHOTO_FILE_SIZE = 5 * 1024 * 1024;
const MAX_RESUME_PHOTO_EDGE = 720;
const RESUME_PHOTO_OUTPUT_QUALITY = 0.82;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("图片读取失败，请重试"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片处理失败，请更换文件后重试"));
    image.src = src;
  });
}

async function optimizeResumePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请上传 JPG、PNG 或 WebP 图片");
  }

  if (file.size > MAX_RESUME_PHOTO_FILE_SIZE) {
    throw new Error("图片请控制在 5MB 以内");
  }

  const source = await readFileAsDataUrl(file);
  if (!source) {
    throw new Error("图片读取失败，请重试");
  }

  const image = await loadImageElement(source);
  const longestEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const scale = longestEdge > MAX_RESUME_PHOTO_EDGE ? MAX_RESUME_PHOTO_EDGE / longestEdge : 1;
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器暂不支持图片处理，请更换浏览器后重试");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", RESUME_PHOTO_OUTPUT_QUALITY);
}

function createRoleExperienceItem(): WorkExperience {
  return {
    company: "",
    role: "",
    duration: "",
    achievements: [],
  };
}

function createInternshipItem(): InternshipExperience {
  return createRoleExperienceItem();
}

function createEducationItem(): Education {
  return {
    school: "",
    major: "",
    degree: "",
    duration: "",
  };
}

function createCampusItem(): CampusExperience {
  return {
    organization: "",
    role: "",
    duration: "",
    highlights: [],
  };
}

function createProjectItem(): ProjectExperience {
  return {
    name: "",
    role: "",
    duration: "",
    highlights: [],
  };
}

function createAwardItem(): Award {
  return {
    name: "",
    issuer: "",
    date: "",
    detail: "",
  };
}

function createCertificationItem(): Certification {
  return {
    name: "",
    issuer: "",
    date: "",
  };
}

function createLanguageItem(): LanguageSkill {
  return {
    name: "",
    proficiency: "",
  };
}

function createSkillGroupItem(): ProfessionalSkillGroup {
  return {
    category: "",
    items: [],
  };
}

function WorkspaceCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-[28px] border border-stone-300/70 bg-[#fffdfa] shadow-[0_12px_40px_rgba(15,23,42,0.05)]", className)}>{children}</section>;
}

function SectionPanel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <WorkspaceCard>
      <div className="space-y-5 px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </WorkspaceCard>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {hint ? <span className="text-xs font-normal text-slate-400">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function formatDraftUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SegmentAiAssistant({
  sectionTitle,
  fieldLabel,
  persona,
  value,
  multiline = false,
  disabled = false,
  onApply,
}: SegmentAiAssistantProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SegmentOptimizeMode>("results");

  async function handleOptimize() {
    if (!value.trim()) {
      setError("先填写这段内容，再让 AI 帮你优化。");
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const response = await fetch("/api/optimize-resume-segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sectionTitle,
          fieldLabel,
          persona,
          text: value,
          mode,
        }),
      });

      const payload = (await response.json()) as { optimizedText?: string; error?: string };
      if (!response.ok || !payload.optimizedText) {
        throw new Error(payload.error || "AI 优化失败");
      }

      setSuggestion(payload.optimizedText);
    } catch (optimizeError) {
      setError(optimizeError instanceof Error ? optimizeError.message : "AI 优化失败");
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <div className="mt-3 rounded-[20px] border border-stone-200 bg-stone-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI Assist</p>
          <p className="mt-1 text-sm font-medium text-slate-700">只优化当前这段，不会改动其他内容</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-stone-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode("concise")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                mode === "concise" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-stone-100",
              )}
            >
              更简洁
            </button>
            <button
              type="button"
              onClick={() => setMode("results")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                mode === "results" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-stone-100",
              )}
            >
              更结果导向
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-stone-300 bg-white text-slate-800 hover:bg-stone-100"
            onClick={handleOptimize}
            disabled={disabled || isOptimizing}
          >
            <Sparkle className="h-3.5 w-3.5" />
            {isOptimizing ? "优化中..." : "优化这段"}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {suggestion ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-[16px] border border-[#e7c7ac] bg-[#fff7ef] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a5a33]">AI 建议</p>
            {multiline ? (
              <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{suggestion}</pre>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-700">{suggestion}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-slate-900 px-3 text-white hover:bg-slate-800"
              onClick={() => {
                onApply(suggestion);
                setSuggestion("");
              }}
            >
              采用建议
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-stone-300 bg-white text-slate-800 hover:bg-stone-100"
              onClick={() => setSuggestion("")}
            >
              关闭
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavigationButton({
  active,
  title,
  description,
  badge,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  badge: string;
  icon: typeof Sparkles;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-3xl border px-4 py-4 text-left transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]"
          : "border-stone-200 bg-white/90 text-slate-800 hover:border-stone-300 hover:bg-stone-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border",
              active ? "border-white/20 bg-white/10 text-white" : "border-stone-200 bg-[#f7efe6] text-[#b85c2c]",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className={cn("mt-1 text-xs leading-5", active ? "text-white/70" : "text-slate-500")}>{description}</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            active ? "bg-white/12 text-white/85" : "bg-stone-100 text-slate-500",
          )}
        >
          {badge}
        </span>
      </div>
    </button>
  );
}

function PersonaButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[22px] border px-4 py-4 text-left transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_35px_rgba(15,23,42,0.14)]"
          : "border-stone-200 bg-white text-slate-800 hover:border-stone-300 hover:bg-stone-50",
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className={cn("mt-2 text-xs leading-5", active ? "text-white/75" : "text-slate-500")}>{description}</p>
    </button>
  );
}

function ItemCard({ title, index, onDelete, children }: { title: string; index: number; onDelete: () => void; children: ReactNode }) {
  return (
    <div className="rounded-[26px] border border-stone-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">条目 {index + 1}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-[24px] border border-dashed border-stone-300 bg-white px-5 py-6 text-sm text-slate-500">{text}</div>;
}

function sectionIcon(moduleId: ResumeModuleId): typeof Sparkles {
  switch (moduleId) {
    case "profile":
      return UserRound;
    case "summary":
      return PencilLine;
    case "skills":
      return Layers3;

    case "education":
      return GraduationCap;
    case "internships":
      return BriefcaseBusiness;
    case "campus":
      return Medal;
    case "work":
      return BriefcaseBusiness;
    case "projects":
      return Rocket;
    case "awards":
      return Trophy;
    case "credentials":
      return Languages;
    default:
      return Sparkles;
  }
}

function countBadge(required: boolean, count: number, suffix: string) {
  if (count > 0) {
    return `${count}${suffix}`;
  }

  return required ? "必填" : "选填";
}

export default function ResumeCreatorWorkspace() {
  const [draft, setDraft] = useState<ResumeData>(() => createStarterResumeData("graduate"));
  const [drafts, setDrafts] = useState<StoredResumeDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const resumeBuilderRef = useRef<ResumeBuilderHandle>(null);
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>("profile");
  const [hydrated, setHydrated] = useState(false);
  const [saveMessage, setSaveMessage] = useState("正在读取本地草稿...");
  const [mobileBuilderTab, setMobileBuilderTab] = useState<"edit" | "preview">("edit");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);


  useEffect(() => {
    try {
      const workspace = readResumeDraftWorkspace(window.localStorage);
      if (workspace.drafts.length > 0) {
        const active = workspace.drafts.find((item) => item.id === workspace.activeDraftId) ?? workspace.drafts[0];
        setDrafts(workspace.drafts);
        setActiveDraftId(active?.id ?? null);
        setDraft(active?.data ?? createStarterResumeData("graduate"));
        setSaveMessage("已恢复上次编辑的简历草稿");
      } else {
        const starter = createStoredResumeDraft(createStarterResumeData("graduate"));
        setDrafts([starter]);
        setActiveDraftId(starter.id);
        setDraft(starter.data);
        setSaveMessage("当前为示例简历，可直接修改或新建你的版本");
      }
    } catch {
      const starter = createStoredResumeDraft(createStarterResumeData("graduate"));
      setDrafts([starter]);
      setActiveDraftId(starter.id);
      setDraft(starter.data);
      setSaveMessage("草稿读取失败，已回退到示例内容");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !activeDraftId) {
      return;
    }

    setDrafts((current) => {
      const nextDrafts = current.some((item) => item.id === activeDraftId)
        ? current.map((item) =>
            item.id === activeDraftId
              ? {
                  ...item,
                  title: getResumeDraftTitle(draft, item.title),
                  updatedAt: new Date().toISOString(),
                  data: normalizeResumeData(draft),
                }
              : item,
          )
        : [
            createStoredResumeDraft(draft, {
              id: activeDraftId,
            }),
            ...current,
          ];

      writeResumeDraftWorkspace(window.localStorage, {
        drafts: nextDrafts,
        activeDraftId,
      });

      return nextDrafts;
    });
    setSaveMessage("内容已自动保存，可随时继续编辑之前的简历");
  }, [activeDraftId, draft, hydrated]);

  const personaDefinition = useMemo(() => getResumePersonaDefinition(draft.persona), [draft.persona]);
  const visibleModuleRules = useMemo(() => getVisibleResumeModules(draft.persona), [draft.persona]);
  const visibleModuleIds = useMemo(() => visibleModuleRules.map((item) => item.id), [visibleModuleRules]);

  useEffect(() => {
    if (!visibleModuleIds.includes(activeSection)) {
      setActiveSection(visibleModuleIds[0] ?? "profile");
    }
  }, [activeSection, visibleModuleIds]);

  function updatePersonalInfo(field: keyof ResumeData["personal_info"], value: string) {
    setDraft((current) => ({
      ...current,
      personal_info: {
        ...current.personal_info,
        [field]: value,
      },
    }));
  }

  function updatePrimaryLink(value: string) {
    setDraft((current) => ({
      ...current,
      personal_info: {
        ...current.personal_info,
        website: value,
        github: "",
        linkedin: "",
      },
    }));
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);

    try {
      const photo = await optimizeResumePhoto(file);
      setDraft((current) => ({
        ...current,
        personal_info: {
          ...current.personal_info,
          photo,
        },
      }));
      setSaveMessage("个人照片已更新");
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "图片上传失败，请重试");
    } finally {
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
      setIsUploadingPhoto(false);
    }
  }

  function openPhotoPicker() {
    photoInputRef.current?.click();
  }

  function removePhoto() {
    setDraft((current) => ({
      ...current,
      personal_info: {
        ...current.personal_info,
        photo: "",
      },
    }));
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
    setSaveMessage("个人照片已移除");
  }

  function updateInternship(index: number, field: RoleExperienceTextField, value: string) {
    setDraft((current) => ({
      ...current,
      internships: current.internships.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateInternshipAchievements(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      internships: current.internships.map((item, itemIndex) =>
        itemIndex === index ? { ...item, achievements: parseMultilineText(value) } : item,
      ),
    }));
  }

  function updateWorkExperience(index: number, field: RoleExperienceTextField, value: string) {
    setDraft((current) => ({
      ...current,
      work_experience: current.work_experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function updateWorkAchievements(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      work_experience: current.work_experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, achievements: parseMultilineText(value) } : item,
      ),
    }));
  }

  function updateEducation(index: number, field: EducationTextField, value: string) {
    setDraft((current) => ({
      ...current,
      education: current.education.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateCampus(index: number, field: CampusTextField, value: string) {
    setDraft((current) => ({
      ...current,
      campus_experience: current.campus_experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function updateCampusHighlights(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      campus_experience: current.campus_experience.map((item, itemIndex) =>
        itemIndex === index ? { ...item, highlights: parseMultilineText(value) } : item,
      ),
    }));
  }

  function updateProject(index: number, field: ProjectTextField, value: string) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateProjectHighlights(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      projects: current.projects.map((item, itemIndex) =>
        itemIndex === index ? { ...item, highlights: parseMultilineText(value) } : item,
      ),
    }));
  }

  function updateAward(index: number, field: AwardTextField, value: string) {
    setDraft((current) => ({
      ...current,
      awards: current.awards.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateCertification(index: number, field: CertificationTextField, value: string) {
    setDraft((current) => ({
      ...current,
      certifications: current.certifications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }

  function updateLanguage(index: number, field: LanguageTextField, value: string) {
    setDraft((current) => ({
      ...current,
      languages: current.languages.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateSkills(value: string) {
    const items = parseMultilineText(value);

    setDraft((current) => ({
      ...current,
      skills: items.length > 0 ? [{ category: "核心技能", items }] : [],
    }));
  }

  function updateSkillGroup(index: number, field: SkillGroupTextField, value: string) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  }

  function updateSkillGroupItems(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      skills: current.skills.map((item, itemIndex) =>
        itemIndex === index ? { ...item, items: parseMultilineText(value) } : item,
      ),
    }));
  }

  function switchPersona(persona: ResumePersona) {
    if (persona === draft.persona) {
      return;
    }

    setDraft((current) => ({
      ...current,
      persona,
    }));
    setSaveMessage(`已切换到${getResumePersonaDefinition(persona).label}预设，当前内容已保留`);
  }

  function createNewDraft() {
    const next = createStoredResumeDraft(createEmptyResumeData(draft.persona), {
      title: `新简历 ${drafts.length + 1}`,
    });
    setDraft(next.data);
    setDrafts((current) => [next, ...current]);
    setActiveDraftId(next.id);
    setActiveSection("profile");
    setSaveMessage("已新建空白简历，可继续填写");
  }

  function duplicateCurrentDraft() {
    const duplicate = createStoredResumeDraft(draft, {
      title: `${getResumeDraftTitle(draft)} 副本`,
    });
    setDraft(duplicate.data);
    setDrafts((current) => [duplicate, ...current]);
    setActiveDraftId(duplicate.id);
    setSaveMessage("已复制当前简历，方便继续修改不同版本");
  }

  function switchToDraft(draftId: string) {
    const next = drafts.find((item) => item.id === draftId);
    if (!next || draftId === activeDraftId) {
      return;
    }

    setDraft(next.data);
    setActiveDraftId(next.id);
    setActiveSection("profile");
    setSaveMessage(`已切换到《${next.title}》`);
  }

  function deleteCurrentDraft() {
    if (!activeDraftId) {
      return;
    }

    const remainingDrafts = drafts.filter((item) => item.id !== activeDraftId);
    if (remainingDrafts.length === 0) {
      const fallback = createStoredResumeDraft(createStarterResumeData(draft.persona));
      setDrafts([fallback]);
      setActiveDraftId(fallback.id);
      setDraft(fallback.data);
      setSaveMessage("已删除当前简历，并恢复一个示例版本");
      return;
    }

    const nextActive = remainingDrafts[0];
    setDrafts(remainingDrafts);
    setActiveDraftId(nextActive.id);
    setDraft(nextActive.data);
    setSaveMessage(`已删除当前简历，正在编辑《${nextActive.title}》`);
  }

  function resetToEmpty() {
    const emptyDraft = createEmptyResumeData(draft.persona);
    setDraft(emptyDraft);
    setSaveMessage("已清空当前草稿");
  }

  function resetToStarter() {
    const starterDraft = createStarterResumeData(draft.persona);
    setDraft(starterDraft);
    setSaveMessage(`已恢复${personaDefinition.label}示例简历`);
  }

  const documentTitle = draft.personal_info.name?.trim()
    ? `${draft.personal_info.name} 的简历`
    : `${personaDefinition.label}简历`;

  const sections: SectionMeta[] = useMemo(() => {
    const dynamicSections = visibleModuleRules.map((rule) => {
      let badge = rule.required ? "必填" : "选填";

      switch (rule.id) {
        case "profile":
          badge = draft.personal_info.name ? "已填" : rule.required ? "必填" : "选填";
          break;
        case "summary":
          badge = draft.professional_summary.trim() ? "已填" : rule.required ? "必填" : "选填";
          break;
        case "skills":
          badge = countBadge(rule.required, draft.skills.reduce((total, group) => total + group.items.length, 0), "项");
          break;

        case "education":
          badge = countBadge(rule.required, draft.education.length, "段");
          break;
        case "internships":
          badge = countBadge(rule.required, draft.internships.length, "段");
          break;
        case "campus":
          badge = countBadge(rule.required, draft.campus_experience.length, "段");
          break;
        case "work":
          badge = countBadge(rule.required, draft.work_experience.length, "段");
          break;
        case "projects":
          badge = countBadge(rule.required, draft.projects.length, "个");
          break;
        case "awards":
          badge = countBadge(rule.required, draft.awards.length, "项");
          break;
        case "credentials":
          badge = countBadge(rule.required, draft.certifications.length + draft.languages.length, "条");
          break;
      }

      return {
        id: rule.id,
        title: getModuleLabel(draft.persona, rule.id),
        description: rule.id === "summary" ? personaDefinition.summaryHint : RESUME_MODULE_CATALOG[rule.id].description,
        badge,
        icon: sectionIcon(rule.id),
      } satisfies SectionMeta;
    });

    return dynamicSections;
  }, [draft, personaDefinition, visibleModuleRules]);

  const activeMeta = sections.find((section) => section.id === activeSection) ?? sections[0];

  function renderProfileSection() {
    const primaryLink = draft.personal_info.website || draft.personal_info.github || draft.personal_info.linkedin || "";

    return (
      <SectionPanel eyebrow="Profile" title={"\u628a\u62ac\u5934\u4fe1\u606f\u5199\u5f97\u6e05\u695a"} description={"\u4e2a\u4eba\u4fe1\u606f\u4e0d\u9700\u8981\u590d\u6742\uff0c\u4f46\u5fc5\u987b\u8ba9\u62db\u8058\u65b9\u5728\u51e0\u79d2\u5185\u77e5\u9053\u4f60\u662f\u8c01\u3001\u60f3\u6295\u4ec0\u4e48\u5c97\u4f4d\uff0c\u4ee5\u53ca\u5982\u4f55\u8054\u7cfb\u4f60\u3002"}>
        <div className="flex items-start justify-between">
          <div className="mr-8 min-w-0 flex-1">
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-5">
              <Field label={"\u59d3\u540d"}>
                <input value={draft.personal_info.name} onChange={(event) => updatePersonalInfo("name", event.target.value)} className={inputClassName} placeholder={"\u4f8b\u5982\uff1a\u5f20\u4e09"} />
              </Field>
              <Field label={"\u6c42\u804c\u6807\u9898"}>
                <input value={draft.personal_info.headline ?? ""} onChange={(event) => updatePersonalInfo("headline", event.target.value)} className={inputClassName} placeholder={"\u4f8b\u5982\uff1a\u65b0\u5a92\u4f53\u8fd0\u8425 / \u9ad8\u7ea7\u524d\u7aef\u5de5\u7a0b\u5e08"} />
              </Field>
              <Field label={"\u624b\u673a\u53f7"}>
                <input value={draft.personal_info.phone ?? ""} onChange={(event) => updatePersonalInfo("phone", event.target.value)} className={inputClassName} placeholder="138-0000-0000" />
              </Field>
              <Field label={"\u6240\u5728\u5730"}>
                <input value={draft.personal_info.location ?? ""} onChange={(event) => updatePersonalInfo("location", event.target.value)} className={inputClassName} placeholder={"\u4e0a\u6d77 / \u5317\u4eac / \u6df1\u5733"} />
              </Field>
              <div className="col-span-2">
                <Field label={"\u90ae\u7bb1"}>
                  <input value={draft.personal_info.email ?? ""} onChange={(event) => updatePersonalInfo("email", event.target.value)} className={inputClassName} placeholder="hello@example.com" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label={"\u4f5c\u54c1\u96c6 / GitHub / LinkedIn"}>
                  <input value={primaryLink} onChange={(event) => updatePrimaryLink(event.target.value)} className={inputClassName} placeholder={"https://your-site.com \u6216 github.com/your-name"} />
                </Field>
              </div>
            </div>
          </div>

          <div className="flex w-[140px] shrink-0 flex-col items-stretch gap-3 pt-0.5">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">{"\u4e2a\u4eba\u7167\u7247"}</p>
              <p className="text-xs leading-5 text-slate-500">{"\u7528\u4e8e\u7b80\u5386\u5934\u90e8\u5c55\u793a\uff0c\u5efa\u8bae\u4e0a\u4f20\u6e05\u6670\u8bc1\u4ef6\u7167\u3002"}</p>
              <input ref={photoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoChange} />
            </div>

            <div className="flex justify-center rounded-[24px] border border-stone-200 bg-stone-50/80 p-4">
              <ResumePhoto photo={draft.personal_info.photo} name={draft.personal_info.name} className="h-[132px] w-[106px] shrink-0 rounded-[18px] border border-stone-200 bg-white" placeholderClassName="rounded-[18px] bg-white text-slate-400" />
            </div>

            <p className="text-xs leading-5 text-slate-500">{"\u652f\u6301 JPG\u3001PNG\u3001WebP\uff0c\u7cfb\u7edf\u4f1a\u81ea\u52a8\u538b\u7f29\u5904\u7406\u3002"}</p>

            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9 min-w-0 flex-1 justify-center rounded-full border-stone-300 bg-white px-3 text-slate-800 hover:bg-stone-100" onClick={openPhotoPicker} disabled={isUploadingPhoto}>
                {isUploadingPhoto ? "\u4e0a\u4f20\u4e2d..." : draft.personal_info.photo ? "\u66f4\u6362\u7167\u7247" : "\u4e0a\u4f20\u7167\u7247"}
              </Button>
              {draft.personal_info.photo ? (
                <Button type="button" variant="outline" className="h-9 min-w-0 flex-1 justify-center rounded-full border-red-200 bg-white px-3 text-red-600 hover:bg-red-50" onClick={removePhoto}>
                  {"\u5220\u9664"}
                </Button>
              ) : null}
            </div>

            {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
          </div>
        </div>
      </SectionPanel>
    );
  }

  function renderSummarySection() {
    return (
      <SectionPanel eyebrow="Summary" title={personaDefinition.summaryTitle} description={personaDefinition.summaryHint}>
        <Field label={personaDefinition.summaryTitle} hint="建议 3 到 4 句，优先写方向、年限、能力和结果">
          <Textarea
            value={draft.professional_summary}
            onChange={(event) => setDraft((current) => ({ ...current, professional_summary: event.target.value }))}
            rows={6}
            className="min-h-32 rounded-2xl border-stone-300 bg-white px-4 py-3"
            placeholder={
              draft.persona === "experienced"
                ? "例如：5 年 B 端产品经验，主导后台系统和流程优化项目，擅长跨部门协作与需求落地，持续推动效率提升。"
                : "例如：新闻传播专业应届生，拥有内容运营实习和校园活动策划经验，执行力强，能够快速理解业务并完成交付。"
            }
          />
          <SegmentAiAssistant
            sectionTitle={personaDefinition.summaryTitle}
            fieldLabel={personaDefinition.summaryTitle}
            persona={draft.persona}
            value={draft.professional_summary}
            onApply={(nextValue) => setDraft((current) => ({ ...current, professional_summary: nextValue }))}
          />
        </Field>
      </SectionPanel>
    );
  }

  function renderSkillsSection() {
    const skillText = toMultilineText(buildProfessionalSkills(draft));

    return (
      <SectionPanel
        eyebrow="Skills"
        title="专业技能"
        description="和项目亮点一样，按行填写技能项即可。建议优先保留和目标岗位直接相关的技术、工具或业务能力。"
      >
        <Field label="专业技能" hint="每行一个技能">
          <Textarea
            value={skillText}
            onChange={(event) => updateSkills(event.target.value)}
            rows={6}
            className="min-h-28 rounded-2xl border-stone-300 bg-white px-4 py-3"
            placeholder={"例如：TypeScript\nReact\nNext.js\nSQL"}
          />
        </Field>
      </SectionPanel>
    );
  }

  function renderRoleExperienceSection(options: {
    eyebrow: string;
    title: string;
    description: string;
    items: WorkExperience[];
    emptyText: string;
    addLabel: string;
    onAdd: () => void;
    onDelete: (index: number) => void;
    onFieldChange: (index: number, field: RoleExperienceTextField, value: string) => void;
    onAchievementsChange: (index: number, value: string) => void;
  }) {
    return (
      <SectionPanel eyebrow={options.eyebrow} title={options.title} description={options.description}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4">
          <p className="text-sm text-slate-600">建议每段经历写 2 到 4 条要点，尽量使用“做了什么 + 产出什么”的结果导向表达。</p>
          <Button type="button" variant="outline" className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100" onClick={options.onAdd}>
            <Plus className="h-4 w-4" />
            {options.addLabel}
          </Button>
        </div>

        {options.items.length === 0 ? <EmptyHint text={options.emptyText} /> : null}

        <div className="space-y-4">
          {options.items.map((item, index) => (
            <ItemCard key={`${options.eyebrow}-${index}`} title={item.role || item.company || `${options.title} ${index + 1}`} index={index} onDelete={() => options.onDelete(index)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="公司 / 机构">
                  <input value={item.company} onChange={(event) => options.onFieldChange(index, "company", event.target.value)} className={inputClassName} placeholder="例如：某互联网公司" />
                </Field>
                <Field label="岗位 / 角色">
                  <input value={item.role} onChange={(event) => options.onFieldChange(index, "role", event.target.value)} className={inputClassName} placeholder="例如：产品运营实习生" />
                </Field>
              </div>
              <Field label="时间">
                <input value={item.duration} onChange={(event) => options.onFieldChange(index, "duration", event.target.value)} className={inputClassName} placeholder="例如：2024.07 - 2024.10" />
              </Field>
              <Field label="经历亮点" hint="每行一个要点">
                <Textarea
                  value={toMultilineText(item.achievements)}
                  onChange={(event) => options.onAchievementsChange(index, event.target.value)}
                  rows={5}
                  className="min-h-28 rounded-2xl border-stone-300 bg-white px-4 py-3"
                  placeholder="例如：负责内容排期与选题执行，支持多渠道传播并完成数据复盘。"
                />
                <SegmentAiAssistant
                  sectionTitle={options.title}
                  fieldLabel={`${options.title}亮点`}
                  persona={draft.persona}
                  value={toMultilineText(item.achievements)}
                  multiline
                  onApply={(nextValue) => options.onAchievementsChange(index, nextValue)}
                />
              </Field>
            </ItemCard>
          ))}
        </div>
      </SectionPanel>
    );
  }

  function renderEducationSection() {
    return (
      <SectionPanel eyebrow="Education" title="教育背景" description="学生阶段可以补充绩点、主修课程或研究方向；职场阶段则保持简洁，只保留和岗位相关的核心信息。">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4">
          <p className="text-sm text-slate-600">通常保留最高学历或与岗位最相关的一段教育经历即可。</p>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100"
            onClick={() => setDraft((current) => ({ ...current, education: [...current.education, createEducationItem()] }))}
          >
            <Plus className="h-4 w-4" />
            添加教育经历
          </Button>
        </div>

        {draft.education.length === 0 ? <EmptyHint text="还没有教育背景，点击右上角添加。" /> : null}

        <div className="space-y-4">
          {draft.education.map((education, index) => (
            <ItemCard
              key={`education-${index}`}
              title={education.school || `教育经历 ${index + 1}`}
              index={index}
              onDelete={() =>
                setDraft((current) => ({
                  ...current,
                  education: current.education.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="学校">
                  <input value={education.school} onChange={(event) => updateEducation(index, "school", event.target.value)} className={inputClassName} placeholder="例如：同济大学" />
                </Field>
                <Field label="时间">
                  <input value={education.duration} onChange={(event) => updateEducation(index, "duration", event.target.value)} className={inputClassName} placeholder="例如：2021.09 - 2025.06" />
                </Field>
                <Field label="专业">
                  <input value={education.major} onChange={(event) => updateEducation(index, "major", event.target.value)} className={inputClassName} placeholder="例如：计算机科学与技术" />
                </Field>
                <Field label="学历">
                  <input value={education.degree} onChange={(event) => updateEducation(index, "degree", event.target.value)} className={inputClassName} placeholder="例如：本科 / 硕士" />
                </Field>
              </div>
            </ItemCard>
          ))}
        </div>
      </SectionPanel>
    );
  }

  function renderCampusSection() {
    return (
      <SectionPanel eyebrow="Campus" title="校园经历" description="学生会、社团、竞赛组织、志愿活动都可以写，但重点依然是你承担的角色和结果，不是简单罗列参与过。">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4">
          <p className="text-sm text-slate-600">挑最能证明组织协调、执行力或岗位相关能力的经历来写。</p>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100"
            onClick={() => setDraft((current) => ({ ...current, campus_experience: [...current.campus_experience, createCampusItem()] }))}
          >
            <Plus className="h-4 w-4" />
            添加校园经历
          </Button>
        </div>

        {draft.campus_experience.length === 0 ? <EmptyHint text="暂无校园经历，可补充学生组织、社团、竞赛或志愿活动。" /> : null}

        <div className="space-y-4">
          {draft.campus_experience.map((item, index) => (
            <ItemCard
              key={`campus-${index}`}
              title={item.role || item.organization || `校园经历 ${index + 1}`}
              index={index}
              onDelete={() =>
                setDraft((current) => ({
                  ...current,
                  campus_experience: current.campus_experience.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="组织 / 团队">
                  <input value={item.organization} onChange={(event) => updateCampus(index, "organization", event.target.value)} className={inputClassName} placeholder="例如：校学生会宣传部" />
                </Field>
                <Field label="角色 / 职务">
                  <input value={item.role} onChange={(event) => updateCampus(index, "role", event.target.value)} className={inputClassName} placeholder="例如：部长 / 干事 / 项目负责人" />
                </Field>
              </div>
              <Field label="时间">
                <input value={item.duration} onChange={(event) => updateCampus(index, "duration", event.target.value)} className={inputClassName} placeholder="例如：2023.09 - 2024.06" />
              </Field>
              <Field label="经历亮点" hint="每行一个要点">
                <Textarea
                  value={toMultilineText(item.highlights)}
                  onChange={(event) => updateCampusHighlights(index, event.target.value)}
                  rows={5}
                  className="min-h-28 rounded-2xl border-stone-300 bg-white px-4 py-3"
                  placeholder="例如：负责校园讲座现场执行与嘉宾对接，协助完成宣传物料和报名流程搭建。"
                />
                <SegmentAiAssistant
                  sectionTitle="校园经历"
                  fieldLabel="校园经历亮点"
                  persona={draft.persona}
                  value={toMultilineText(item.highlights)}
                  multiline
                  onApply={(nextValue) => updateCampusHighlights(index, nextValue)}
                />
              </Field>
            </ItemCard>
          ))}
        </div>
      </SectionPanel>
    );
  }

  function renderProjectSection() {
    return (
      <SectionPanel eyebrow="Projects" title="项目经历" description="项目是承上启下的证明材料。无论是课程项目、社团项目还是业务项目，都要写清你负责了什么、做成了什么。">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4">
          <p className="text-sm text-slate-600">优先保留代表性项目，不要把所有事情都堆在简历里。</p>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100"
            onClick={() => setDraft((current) => ({ ...current, projects: [...current.projects, createProjectItem()] }))}
          >
            <Plus className="h-4 w-4" />
            添加项目
          </Button>
        </div>

        {draft.projects.length === 0 ? <EmptyHint text="还没有项目经历，可以补充课程项目、作品集项目或业务项目。" /> : null}

        <div className="space-y-4">
          {draft.projects.map((project, index) => (
            <ItemCard
              key={`project-${index}`}
              title={project.name || `项目 ${index + 1}`}
              index={index}
              onDelete={() =>
                setDraft((current) => ({
                  ...current,
                  projects: current.projects.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="项目名称">
                  <input value={project.name} onChange={(event) => updateProject(index, "name", event.target.value)} className={inputClassName} placeholder="例如：增长运营中台" />
                </Field>
                <Field label="你的角色">
                  <input value={project.role} onChange={(event) => updateProject(index, "role", event.target.value)} className={inputClassName} placeholder="例如：项目负责人 / 核心成员" />
                </Field>
              </div>
              <Field label="时间">
                <input value={project.duration} onChange={(event) => updateProject(index, "duration", event.target.value)} className={inputClassName} placeholder="例如：2024.01 - 2024.12" />
              </Field>
              <Field label="项目亮点" hint="每行一个要点">
                <Textarea
                  value={toMultilineText(project.highlights)}
                  onChange={(event) => updateProjectHighlights(index, event.target.value)}
                  rows={5}
                  className="min-h-28 rounded-2xl border-stone-300 bg-white px-4 py-3"
                  placeholder="例如：设计后台数据看板和权限体系，支持运营团队自助分析和活动复盘。"
                />
                <SegmentAiAssistant
                  sectionTitle="项目经历"
                  fieldLabel="项目亮点"
                  persona={draft.persona}
                  value={toMultilineText(project.highlights)}
                  multiline
                  onApply={(nextValue) => updateProjectHighlights(index, nextValue)}
                />
              </Field>
            </ItemCard>
          ))}
        </div>
      </SectionPanel>
    );
  }

  function renderAwardsSection() {
    return (
      <SectionPanel eyebrow="Awards" title="荣誉奖项" description="奖项不是必填，但如果能强化你的竞争力，可以作为简历后半部分的信任补充。">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 px-4 py-4">
          <p className="text-sm text-slate-600">奖项建议只保留含金量高、与岗位相关或最近两年的内容。</p>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100"
            onClick={() => setDraft((current) => ({ ...current, awards: [...current.awards, createAwardItem()] }))}
          >
            <Plus className="h-4 w-4" />
            添加奖项
          </Button>
        </div>

        {draft.awards.length === 0 ? <EmptyHint text="暂无荣誉奖项，可补充竞赛、奖学金、称号或认证结果。" /> : null}

        <div className="space-y-4">
          {draft.awards.map((award, index) => (
            <ItemCard
              key={`award-${index}`}
              title={award.name || `奖项 ${index + 1}`}
              index={index}
              onDelete={() =>
                setDraft((current) => ({
                  ...current,
                  awards: current.awards.filter((_, itemIndex) => itemIndex !== index),
                }))
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="奖项名称">
                  <input value={award.name} onChange={(event) => updateAward(index, "name", event.target.value)} className={inputClassName} placeholder="例如：国家奖学金" />
                </Field>
                <Field label="授予机构">
                  <input value={award.issuer} onChange={(event) => updateAward(index, "issuer", event.target.value)} className={inputClassName} placeholder="例如：教育部" />
                </Field>
                <Field label="日期">
                  <input value={award.date} onChange={(event) => updateAward(index, "date", event.target.value)} className={inputClassName} placeholder="例如：2024.12" />
                </Field>
              </div>
              <Field label="补充说明">
                <input value={award.detail ?? ""} onChange={(event) => updateAward(index, "detail", event.target.value)} className={inputClassName} placeholder="例如：省级二等奖，负责方案策划与答辩" />
              </Field>
            </ItemCard>
          ))}
        </div>
      </SectionPanel>
    );
  }

  function renderCredentialsSection() {
    return (
      <SectionPanel eyebrow="Credentials" title={"技能证书"} description={"保留和岗位直接相关的技能认证、专业证书与资质说明，避免无关堆砌。"}>
        <div className="space-y-4">
          <WorkspaceCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Certifications</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{"证书"}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full min-w-[112px] justify-center rounded-full border-stone-300 bg-white px-3 text-slate-800 hover:bg-stone-100 sm:w-auto"
                onClick={() => setDraft((current) => ({ ...current, certifications: [...current.certifications, createCertificationItem()] }))}
              >
                <Plus className="h-4 w-4" />
                {"添加"}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {draft.certifications.length === 0 ? <EmptyHint text={"暂无证书信息。"} /> : null}
              {draft.certifications.map((item, index) => (
                <ItemCard
                  key={`cert-${index}`}
                  title={item.name || `证书 ${index + 1}`}
                  index={index}
                  onDelete={() =>
                    setDraft((current) => ({
                      ...current,
                      certifications: current.certifications.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label={"证书名称"}>
                      <input value={item.name} onChange={(event) => updateCertification(index, "name", event.target.value)} className={inputClassName} placeholder={"例如：PMP / 普通话一级乙等"} />
                    </Field>
                    <Field label={"颁发机构"}>
                      <input value={item.issuer} onChange={(event) => updateCertification(index, "issuer", event.target.value)} className={inputClassName} placeholder={"例如：PMI"} />
                    </Field>
                    <Field label={"日期"}>
                      <input value={item.date} onChange={(event) => updateCertification(index, "date", event.target.value)} className={inputClassName} placeholder={"例如：2025.06"} />
                    </Field>
                  </div>
                </ItemCard>
              ))}
            </div>
          </WorkspaceCard>

          <WorkspaceCard className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Supplementary Credentials</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{"补充证书"}</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full min-w-[112px] justify-center rounded-full border-stone-300 bg-white px-3 text-slate-800 hover:bg-stone-100 sm:w-auto"
                onClick={() => setDraft((current) => ({ ...current, languages: [...current.languages, createLanguageItem()] }))}
              >
                <Plus className="h-4 w-4" />
                {"添加"}
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {draft.languages.length === 0 ? <EmptyHint text={"暂无补充证书信息。"} /> : null}
              {draft.languages.map((item, index) => (
                <ItemCard
                  key={`language-${index}`}
                  title={item.name || `补充证书 ${index + 1}`}
                  index={index}
                  onDelete={() =>
                    setDraft((current) => ({
                      ...current,
                      languages: current.languages.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={"证书名称"}>
                      <input value={item.name} onChange={(event) => updateLanguage(index, "name", event.target.value)} className={inputClassName} placeholder={"例如：CET-6 / 普通话一级乙等"} />
                    </Field>
                    <Field label={"证书说明"}>
                      <input value={item.proficiency} onChange={(event) => updateLanguage(index, "proficiency", event.target.value)} className={inputClassName} placeholder={"例如：口语流利 / 成绩优秀 / 可用于工作沟通"} />
                    </Field>
                  </div>
                </ItemCard>
              ))}
            </div>
          </WorkspaceCard>
        </div>
      </SectionPanel>
    );
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "profile":
        return renderProfileSection();
      case "summary":
        return renderSummarySection();
      case "skills":
        return renderSkillsSection();
      case "education":
        return renderEducationSection();
      case "internships":
        return renderRoleExperienceSection({
          eyebrow: "Internships",
          title: "实习经历",
          description: "即便时间不长，也值得写。招聘方看的是你是否已经在真实环境中接触过业务、流程和协作。",
          items: draft.internships,
          emptyText: "还没有实习经历，也可以先补充课程项目或校内项目。",
          addLabel: "添加实习经历",
          onAdd: () => setDraft((current) => ({ ...current, internships: [...current.internships, createInternshipItem()] })),
          onDelete: (index) =>
            setDraft((current) => ({
              ...current,
              internships: current.internships.filter((_, itemIndex) => itemIndex !== index),
            })),
          onFieldChange: updateInternship,
          onAchievementsChange: updateInternshipAchievements,
        });
      case "campus":
        return renderCampusSection();
      case "work":
        return renderRoleExperienceSection({
          eyebrow: "Work",
          title: "工作经历",
          description: "社招简历的核心模块。尽量用结果证明你的职责价值，而不是只写负责过什么。",
          items: draft.work_experience,
          emptyText: "还没有工作经历，当前身份下建议优先补足真实工作项目和量化成果。",
          addLabel: "添加工作经历",
          onAdd: () => setDraft((current) => ({ ...current, work_experience: [...current.work_experience, createRoleExperienceItem()] })),
          onDelete: (index) =>
            setDraft((current) => ({
              ...current,
              work_experience: current.work_experience.filter((_, itemIndex) => itemIndex !== index),
            })),
          onFieldChange: updateWorkExperience,
          onAchievementsChange: updateWorkAchievements,
        });
      case "projects":
        return renderProjectSection();
      case "awards":
        return renderAwardsSection();
      case "credentials":
        return renderCredentialsSection();
      default:
        return renderProfileSection();
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1660px] px-6 pb-16 text-slate-900">
      <div className="mb-5 space-y-5 rounded-[24px] border border-stone-300/70 bg-[rgba(255,252,247,0.78)] px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{documentTitle}</p>
            <p className="mt-1 text-sm text-slate-500">当前模块：{activeMeta.title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">{hydrated ? "内容已自动保存" : "正在准备编辑器"}</div>
            <Button type="button" className="h-10 rounded-full bg-slate-900 px-4 text-white hover:bg-slate-800" onClick={() => resumeBuilderRef.current?.print()}>
              <Download className="h-4 w-4" />
              导出 PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {personaOrder.map((persona) => {
            const definition = getResumePersonaDefinition(persona);
            return (
              <PersonaButton
                key={persona}
                active={draft.persona === persona}
                title={definition.label}
                description={definition.description}
                onClick={() => switchPersona(persona)}
              />
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="rounded-[22px] border border-stone-200 bg-white/82 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f7efe6] text-[#b85c2c]">
                  <Save className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">草稿状态</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{hydrated ? "本地草稿已接管当前工作区" : "正在准备本地草稿"}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{saveMessage}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100" onClick={resetToStarter}>
                  <RotateCcw className="h-4 w-4" />
                  恢复示例
                </Button>
                <Button type="button" variant="outline" className="h-10 rounded-full border-red-200 bg-white px-4 text-red-600 hover:bg-red-50" onClick={resetToEmpty}>
                  <Trash2 className="h-4 w-4" />
                  清空草稿
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-stone-200/90 bg-[#fcf8f2] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">编辑提示</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              身份切换只会调整模块优先级和展示顺序，不会删除已填写内容。切换后直接看右侧预览，就能更快判断当前版面是否合理。
            </p>
          </div>
        </div>

        <div className="rounded-[22px] border border-stone-200 bg-white/82 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">My Resumes</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">随时回到之前的简历继续修改</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">每份简历都会保存在本地浏览器里，你可以新建不同版本、复制当前版本，或切回之前做过的简历。</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100" onClick={createNewDraft}>
                <Plus className="h-4 w-4" />
                新建简历
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full border-stone-300 bg-white px-4 text-slate-800 hover:bg-stone-100" onClick={duplicateCurrentDraft}>
                <Copy className="h-4 w-4" />
                复制当前版本
              </Button>
              <Button type="button" variant="outline" className="h-10 rounded-full border-red-200 bg-white px-4 text-red-600 hover:bg-red-50" onClick={deleteCurrentDraft}>
                <Trash2 className="h-4 w-4" />
                删除当前版本
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {drafts.map((item) => {
              const isActive = item.id === activeDraftId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchToDraft(item.id)}
                  className={cn(
                    "rounded-[20px] border px-4 py-4 text-left transition",
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]"
                      : "border-stone-200 bg-white text-slate-800 hover:border-stone-300 hover:bg-stone-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", isActive ? "bg-white/12 text-white/85" : "bg-stone-100 text-slate-500")}>
                      {isActive ? "当前编辑" : "可切换"}
                    </span>
                  </div>
                  <p className={cn("mt-2 text-xs", isActive ? "text-white/70" : "text-slate-500")}>最近保存：{formatDraftUpdatedAt(item.updatedAt)}</p>
                  <p className={cn("mt-3 text-xs leading-5", isActive ? "text-white/75" : "text-slate-500")}>
                    {item.data.personal_info.headline || getResumePersonaDefinition(item.data.persona).label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 移动端 Tab 切换栏（xl 以下显示） */}
      <div className="mb-4 flex gap-1 rounded-[18px] border border-stone-200 bg-stone-100/80 p-1 xl:hidden">
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileBuilderTab(tab)}
            className={cn(
              "flex-1 rounded-[14px] py-2.5 text-sm font-semibold transition",
              mobileBuilderTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
            )}
          >
            {tab === "edit" ? "编辑简历" : "预览模板"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[240px_minmax(420px,480px)_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(440px,520px)_minmax(0,1fr)]">
        <aside className={cn("space-y-5 xl:sticky xl:top-24 xl:self-start", mobileBuilderTab !== "edit" && "hidden xl:block")}>
          <WorkspaceCard className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <FileStack className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Outline</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">编辑结构</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {sections.map((section) => (
                <NavigationButton
                  key={section.id}
                  active={section.id === activeSection}
                  title={section.title}
                  description={section.description}
                  badge={section.badge}
                  icon={section.icon}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </div>
          </WorkspaceCard>
        </aside>

        <main className="builder-editor-follow xl:min-w-[420px]">
          {renderActiveSection()}
        </main>

        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <ResumeBuilder ref={resumeBuilderRef} data={draft} />
        </aside>
      </div>
    </div>
  );
}
