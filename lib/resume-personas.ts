import type { ResumeModuleId, ResumePersona } from "@/components/templates/types";

export type ResumeModuleConfig = {
  id: ResumeModuleId;
  title: string;
  description: string;
};

export type PersonaModuleRule = {
  id: ResumeModuleId;
  required: boolean;
};

export type ResumePersonaDefinition = {
  persona: ResumePersona;
  label: string;
  shortLabel: string;
  description: string;
  summaryTitle: string;
  summaryHint: string;
  modules: PersonaModuleRule[];
};

export const RESUME_MODULE_CATALOG: Record<ResumeModuleId, ResumeModuleConfig> = {
  profile: {
    id: "profile",
    title: "基本信息",
    description: "姓名、求职标题和联系方式，决定简历抬头是否清晰。",
  },
  summary: {
    id: "summary",
    title: "自我评价",
    description: "用简洁语言概括定位、优势和岗位匹配点。",
  },
  skills: {
    id: "skills",
    title: "专业技能",
    description: "按类别整理岗位相关技能，让招聘方快速看到你的核心能力结构。",
  },
  education: {
    id: "education",
    title: "教育背景",
    description: "学校、专业、学历、时间等核心教育信息。",
  },
  internships: {
    id: "internships",
    title: "实习经历",
    description: "实习岗位、职责和结果，是学生阶段的重要能力证明。",
  },
  campus: {
    id: "campus",
    title: "校园经历",
    description: "学生组织、社团、竞赛和校内项目等经历沉淀。",
  },
  work: {
    id: "work",
    title: "工作经历",
    description: "公司、岗位、职责范围和量化产出。",
  },
  projects: {
    id: "projects",
    title: "项目经历",
    description: "突出独立负责、核心参与和可量化成果。",
  },
  awards: {
    id: "awards",
    title: "荣誉奖项",
    description: "奖学金、竞赛、荣誉称号等补充可信度的内容。",
  },
  credentials: {
    id: "credentials",
    title: "证书资质",
    description: "技能认证、专业证书和岗位相关资质。",
  },
};

export const RESUME_PERSONA_DEFINITIONS: Record<ResumePersona, ResumePersonaDefinition> = {
  intern: {
    persona: "intern",
    label: "实习生",
    shortLabel: "实习",
    description: "优先强调教育、项目、短期实习和校园能力证明。",
    summaryTitle: "自我评价",
    summaryHint: "突出认真、好学、执行力和岗位潜力。",
    modules: [
      { id: "profile", required: true },
      { id: "skills", required: true },
      { id: "education", required: true },
      { id: "internships", required: true },
      { id: "projects", required: true },
      { id: "campus", required: false },
      { id: "awards", required: false },
      { id: "summary", required: false },
      { id: "credentials", required: false },
    ],
  },
  graduate: {
    persona: "graduate",
    label: "应届生",
    shortLabel: "应届",
    description: "兼顾教育背景、实习、校园经历和岗位相关项目。",
    summaryTitle: "自我评价",
    summaryHint: "强调成长性、执行力和可迁移能力。",
    modules: [
      { id: "profile", required: true },
      { id: "skills", required: true },
      { id: "education", required: true },
      { id: "internships", required: true },
      { id: "campus", required: true },
      { id: "projects", required: true },
      { id: "awards", required: false },
      { id: "summary", required: false },
      { id: "credentials", required: false },
    ],
  },
  experienced: {
    persona: "experienced",
    label: "职场人士",
    shortLabel: "社招",
    description: "优先突出工作经历、项目经验和量化业绩。",
    summaryTitle: "职业概述",
    summaryHint: "提炼年限、方向、核心能力和代表性成果。",
    modules: [
      { id: "profile", required: true },
      { id: "skills", required: true },
      { id: "work", required: true },
      { id: "projects", required: true },
      { id: "summary", required: false },
      { id: "education", required: false },
      { id: "credentials", required: false },
    ],
  },
};

export function getResumePersonaDefinition(persona: ResumePersona): ResumePersonaDefinition {
  return RESUME_PERSONA_DEFINITIONS[persona] ?? RESUME_PERSONA_DEFINITIONS.graduate;
}

export function getVisibleResumeModules(persona: ResumePersona): PersonaModuleRule[] {
  return getResumePersonaDefinition(persona).modules;
}

export function getModuleLabel(persona: ResumePersona, moduleId: ResumeModuleId): string {
  if (moduleId === "summary") {
    return getResumePersonaDefinition(persona).summaryTitle;
  }

  return RESUME_MODULE_CATALOG[moduleId].title;
}
