import type {
  Award,
  CampusExperience,
  Certification,
  Education,
  InternshipExperience,
  LanguageSkill,
  PersonalInfo,
  ProfessionalSkillGroup,
  ProjectExperience,
  ResumeData,
  ResumePersona,
  WorkExperience,
} from "@/components/templates/types";

export const BUILDER_DRAFT_STORAGE_KEY = "resume-builder-draft-v2";
export const BUILDER_DRAFTS_STORAGE_KEY = "resume-builder-drafts-v1";
export const BUILDER_ACTIVE_DRAFT_ID_STORAGE_KEY = "resume-builder-active-draft-id-v1";

export type StoredResumeDraft = {
  id: string;
  title: string;
  updatedAt: string;
  data: ResumeData;
};

export type ResumeDraftWorkspace = {
  drafts: StoredResumeDraft[];
  activeDraftId: string | null;
};

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeDateString(value: unknown): string {
  const normalized = safeText(value);
  return normalized || new Date().toISOString();
}

function createResumeDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => safeText(item)).filter(Boolean);
}

function normalizeRoleExperience(value: unknown): WorkExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      company: safeText(item.company),
      role: safeText(item.role),
      duration: safeText(item.duration),
      achievements: normalizeStringList(item.achievements),
    }));
}

function normalizeInternships(value: unknown): InternshipExperience[] {
  return normalizeRoleExperience(value);
}

function normalizeWorkExperience(value: unknown): WorkExperience[] {
  return normalizeRoleExperience(value);
}

function normalizeCampusExperience(value: unknown): CampusExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      organization: safeText(item.organization),
      role: safeText(item.role),
      duration: safeText(item.duration),
      highlights: normalizeStringList(item.highlights),
    }));
}

function normalizeEducation(value: unknown): Education[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      school: safeText(item.school),
      major: safeText(item.major),
      degree: safeText(item.degree),
      duration: safeText(item.duration),
    }));
}

function normalizeProjects(value: unknown): ProjectExperience[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: safeText(item.name),
      role: safeText(item.role),
      duration: safeText(item.duration),
      highlights: normalizeStringList(item.highlights),
    }));
}

function normalizeAwards(value: unknown): Award[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: safeText(item.name),
      issuer: safeText(item.issuer),
      date: safeText(item.date),
      detail: safeText(item.detail),
    }));
}

function normalizeCertifications(value: unknown): Certification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: safeText(item.name),
      issuer: safeText(item.issuer),
      date: safeText(item.date),
    }));
}

function normalizeLanguages(value: unknown): LanguageSkill[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: safeText(item.name),
      proficiency: safeText(item.proficiency),
    }));
}

function normalizePersonalInfo(value: unknown): PersonalInfo {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    name: safeText(source.name),
    headline: safeText(source.headline),
    contact: safeText(source.contact),
    email: safeText(source.email),
    phone: safeText(source.phone),
    location: safeText(source.location),
    website: safeText(source.website),
    photo: safeText(source.photo),
    linkedin: safeText(source.linkedin),
    github: safeText(source.github),
  };
}

function inferSkillCategory(skill: string): string {
  const value = skill.toLowerCase();

  if (
    /(typescript|javascript|python|java|go|sql|html|css|excel|power bi|tableau|react|next\.js|node\.js|vue|docker|kubernetes|git|figma|photoshop|axure|notion|jira)/.test(
      value,
    )
  ) {
    if (/(typescript|javascript|python|java|go|sql|html|css)/.test(value)) {
      return "技术语言";
    }

    if (/(react|next\.js|node\.js|vue)/.test(value)) {
      return "框架平台";
    }

    return "工具能力";
  }

  if (/(运营|策划|增长|分析|研究|沟通|协作|项目管理|产品|用户|数据清洗|问卷|监控|性能|系统设计|aigc)/.test(skill)) {
    return "业务能力";
  }

  return "核心技能";
}

function groupLegacySkills(skills: string[]): ProfessionalSkillGroup[] {
  const grouped = new Map<string, string[]>();

  skills.forEach((skill) => {
    const normalized = safeText(skill);
    if (!normalized) {
      return;
    }

    const category = inferSkillCategory(normalized);
    const items = grouped.get(category) ?? [];
    if (!items.includes(normalized)) {
      items.push(normalized);
    }
    grouped.set(category, items);
  });

  return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
}

function normalizeSkillGroups(value: unknown): ProfessionalSkillGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (value.every((item) => typeof item === "string")) {
    return groupLegacySkills(normalizeStringList(value));
  }

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      category: safeText(item.category),
      items: normalizeStringList(item.items),
    }))
    .filter((item) => item.category || item.items.length > 0)
    .map((item) => ({
      category: item.category || "核心技能",
      items: item.items,
    }));
}

function inferPersonaFromShape(source: Record<string, unknown>): ResumePersona {
  const explicitPersona = safeText(source.persona);
  if (explicitPersona === "intern" || explicitPersona === "graduate" || explicitPersona === "experienced") {
    return explicitPersona;
  }

  const workExperience = normalizeWorkExperience(source.work_experience);
  if (workExperience.length > 0) {
    return "experienced";
  }

  const internships = normalizeInternships(source.internships);
  if (internships.length > 0) {
    return "graduate";
  }

  return "graduate";
}

function createBaseResumeData(persona: ResumePersona): ResumeData {
  return {
    persona,
    personal_info: {
      name: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      photo: "",
    },
    professional_summary: "",
    skills: [],
    internships: [],
    work_experience: [],
    education: [],
    campus_experience: [],
    projects: [],
    awards: [],
    certifications: [],
    languages: [],
  };
}

export function createEmptyResumeData(persona: ResumePersona = "graduate"): ResumeData {
  return createBaseResumeData(persona);
}

export function getResumeDraftTitle(data: ResumeData, fallback = "未命名简历"): string {
  const name = safeText(data.personal_info.name);
  const headline = safeText(data.personal_info.headline);
  const firstCompany = safeText(data.work_experience[0]?.company);
  const firstProject = safeText(data.projects[0]?.name);

  if (name && headline) {
    return `${name} · ${headline}`;
  }

  if (name) {
    return `${name}的简历`;
  }

  if (headline) {
    return headline;
  }

  if (firstCompany) {
    return `${firstCompany}简历`;
  }

  if (firstProject) {
    return `${firstProject}简历`;
  }

  return fallback;
}

function normalizeStoredResumeDraft(value: unknown): StoredResumeDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const data = normalizeResumeData(source.data);

  return {
    id: safeText(source.id) || createResumeDraftId(),
    title: safeText(source.title) || getResumeDraftTitle(data),
    updatedAt: safeDateString(source.updatedAt),
    data,
  };
}

export function sortStoredResumeDrafts(drafts: StoredResumeDraft[]): StoredResumeDraft[] {
  return [...drafts].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt);
    const rightTime = Date.parse(right.updatedAt);

    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

export function createStoredResumeDraft(
  data: ResumeData,
  overrides: Partial<Pick<StoredResumeDraft, "id" | "title" | "updatedAt">> = {},
): StoredResumeDraft {
  const normalized = normalizeResumeData(data);

  return {
    id: overrides.id?.trim() || createResumeDraftId(),
    title: overrides.title?.trim() || getResumeDraftTitle(normalized),
    updatedAt: safeDateString(overrides.updatedAt),
    data: normalized,
  };
}

export function readResumeDraftWorkspace(storage: Pick<Storage, "getItem">): ResumeDraftWorkspace {
  try {
    const rawDrafts = storage.getItem(BUILDER_DRAFTS_STORAGE_KEY);
    const rawActiveDraftId = storage.getItem(BUILDER_ACTIVE_DRAFT_ID_STORAGE_KEY);

    if (rawDrafts) {
      const parsed = JSON.parse(rawDrafts) as unknown;
      const drafts = Array.isArray(parsed)
        ? sortStoredResumeDrafts(
            parsed
              .map((item) => normalizeStoredResumeDraft(item))
              .filter((item): item is StoredResumeDraft => item !== null),
          )
        : [];

      if (drafts.length > 0) {
        const activeDraftId =
          drafts.some((item) => item.id === rawActiveDraftId) ? rawActiveDraftId : drafts[0]?.id ?? null;

        return {
          drafts,
          activeDraftId,
        };
      }
    }

    const legacyDraft = storage.getItem(BUILDER_DRAFT_STORAGE_KEY);
    if (legacyDraft) {
      const parsedLegacy = JSON.parse(legacyDraft) as unknown;
      const draft = createStoredResumeDraft(normalizeResumeData(parsedLegacy));

      return {
        drafts: [draft],
        activeDraftId: draft.id,
      };
    }
  } catch {
    return {
      drafts: [],
      activeDraftId: null,
    };
  }

  return {
    drafts: [],
    activeDraftId: null,
  };
}

export function writeResumeDraftWorkspace(
  storage: Pick<Storage, "setItem" | "removeItem">,
  workspace: ResumeDraftWorkspace,
) {
  const drafts = sortStoredResumeDrafts(workspace.drafts);
  const activeDraftId = drafts.some((item) => item.id === workspace.activeDraftId)
    ? workspace.activeDraftId
    : drafts[0]?.id ?? null;
  const activeDraft = drafts.find((item) => item.id === activeDraftId) ?? null;

  storage.setItem(BUILDER_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));

  if (activeDraftId) {
    storage.setItem(BUILDER_ACTIVE_DRAFT_ID_STORAGE_KEY, activeDraftId);
  } else {
    storage.removeItem(BUILDER_ACTIVE_DRAFT_ID_STORAGE_KEY);
  }

  if (activeDraft) {
    storage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(activeDraft.data));
  } else {
    storage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
  }
}

function skillGroup(category: string, items: string[]): ProfessionalSkillGroup {
  return { category, items };
}

export function createStarterResumeData(persona: ResumePersona = "graduate"): ResumeData {
  if (persona === "intern") {
    return {
      ...createBaseResumeData(persona),
      personal_info: {
        name: "陈晓",
        headline: "数据分析实习生",
        email: "hello@example.com",
        phone: "138-0000-0000",
        location: "上海",
        website: "github.com/chenxiao",
      },
      professional_summary:
        "统计学专业在校生，熟悉 Excel、SQL 和 Python 数据处理，参与过校园调研项目和互联网实习，执行细致，能够快速理解业务需求并完成交付。",
      skills: [
        skillGroup("数据工具", ["Excel", "SQL", "Python", "Power BI"]),
        skillGroup("分析能力", ["数据清洗", "问卷分析", "数据可视化"]),
      ],
      education: [
        {
          school: "上海财经大学",
          major: "统计学",
          degree: "本科",
          duration: "2022.09 - 2026.06",
        },
      ],
      internships: [
        {
          company: "某消费品牌",
          role: "数据分析实习生",
          duration: "2025.07 - 2025.09",
          achievements: [
            "整理 3 个渠道的周报数据口径，搭建统一清洗表，减少团队手工核对时间。",
            "支持用户拉新活动复盘，输出转化漏斗分析，补充活动优化建议。",
          ],
        },
      ],
      projects: [
        {
          name: "高校消费行为调研项目",
          role: "项目负责人",
          duration: "2025.03 - 2025.05",
          highlights: [
            "设计调研问卷并完成 500+ 样本回收，负责数据清洗与描述性统计分析。",
            "输出可视化报告并在院系展示，结论被用于校园品牌合作选题。",
          ],
        },
      ],
      campus_experience: [
        {
          organization: "校学生会学术部",
          role: "干事",
          duration: "2023.09 - 2024.06",
          highlights: ["协助组织行业分享活动，负责嘉宾联络与现场执行。"],
        },
      ],
      awards: [
        {
          name: "校二等奖学金",
          issuer: "上海财经大学",
          date: "2024.12",
          detail: "专业前 10%",
        },
      ],
      certifications: [{ name: "全国计算机二级", issuer: "教育部考试中心", date: "2024.09" }],
      languages: [{ name: "英语", proficiency: "CET-6" }],
    };
  }

  if (persona === "experienced") {
    return {
      ...createBaseResumeData(persona),
      personal_info: {
        name: "林舟",
        headline: "高级前端工程师",
        email: "hello@example.com",
        phone: "138-0000-0000",
        location: "杭州",
        website: "https://portfolio.example.com",
      },
      professional_summary:
        "5 年互联网前端经验，长期负责核心业务平台建设与性能优化，擅长将复杂流程产品化，推动跨团队协作落地，持续用效率和稳定性指标证明价值。",
      skills: [
        skillGroup("技术语言", ["TypeScript", "JavaScript", "HTML/CSS"]),
        skillGroup("框架平台", ["React", "Next.js", "Node.js"]),
        skillGroup("工程能力", ["性能优化", "监控治理", "组件体系设计"]),
      ],
      work_experience: [
        {
          company: "星云科技",
          role: "高级前端工程师",
          duration: "2023.03 - 至今",
          achievements: [
            "负责运营后台核心模块重构，统一组件和权限体系，缩短新需求交付周期。",
            "推动首屏性能优化与错误监控治理，页面稳定性和关键流程体验持续提升。",
          ],
        },
        {
          company: "云帆互动",
          role: "前端工程师",
          duration: "2021.06 - 2023.02",
          achievements: [
            "参与增长工具平台建设，支持活动配置、投放监控和数据看板能力落地。",
            "沉淀通用表单与表格方案，降低多条业务线的重复开发成本。",
          ],
        },
      ],
      education: [
        {
          school: "浙江大学城市学院",
          major: "软件工程",
          degree: "本科",
          duration: "2017.09 - 2021.06",
        },
      ],
      projects: [
        {
          name: "增长运营中台",
          role: "前端负责人",
          duration: "2024.01 - 2024.12",
          highlights: [
            "主导后台系统交互方案和核心页面实现，支持活动配置、审核和复盘全流程。",
            "联动产品、后端和运营梳理复杂权限逻辑，推动系统稳定上线。",
          ],
        },
      ],
      certifications: [{ name: "PMP", issuer: "PMI", date: "2025.03" }],
      languages: [{ name: "英语", proficiency: "可用于工作沟通" }],
    };
  }

  return {
    ...createBaseResumeData(persona),
    personal_info: {
      name: "赵宁",
      headline: "产品运营应届生",
      email: "hello@example.com",
      phone: "138-0000-0000",
      location: "北京",
      website: "linkedin.com/in/zhaoning",
    },
    professional_summary:
      "新闻传播专业应届生，拥有内容运营和活动策划实习经历，熟悉数据复盘、用户洞察和跨部门协作，执行力强，能够快速进入业务节奏。",
    skills: [
      skillGroup("运营能力", ["内容运营", "活动策划", "用户调研"]),
      skillGroup("数据工具", ["Excel", "SQL", "AIGC 工具"]),
    ],
    education: [
      {
        school: "中国传媒大学",
        major: "网络与新媒体",
        degree: "本科",
        duration: "2021.09 - 2025.06",
      },
    ],
    internships: [
      {
        company: "某互联网平台",
        role: "内容运营实习生",
        duration: "2024.07 - 2024.12",
        achievements: [
          "参与内容专题策划与上线执行，跟踪曝光、点击和互动数据表现。",
          "协助搭建周度复盘模板，沉淀选题方向和内容优化建议。",
        ],
      },
    ],
    campus_experience: [
      {
        organization: "校团委新媒体中心",
        role: "内容组负责人",
        duration: "2023.03 - 2024.06",
        highlights: [
          "负责选题排期、稿件审核和成员分工，稳定完成多场校园活动宣发。",
          "组织账号内容复盘，优化封面和标题风格，提高阅读完成度。",
        ],
      },
    ],
    projects: [
      {
        name: "校园品牌联名活动",
        role: "项目核心成员",
        duration: "2024.09 - 2024.11",
        highlights: [
          "参与活动方案策划、物料统筹和现场执行，协同商家和校内社团推进落地。",
          "负责活动复盘与用户反馈收集，输出后续合作优化建议。",
        ],
      },
    ],
    awards: [
      {
        name: "全国大学生广告艺术大赛省级二等奖",
        issuer: "大广赛组委会",
        date: "2024.08",
        detail: "负责传播策略与内容执行",
      },
    ],
    certifications: [{ name: "普通话一级乙等", issuer: "国家语委", date: "2023.11" }],
    languages: [{ name: "英语", proficiency: "CET-6" }],
  };
}

export function normalizeResumeData(value: unknown): ResumeData {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const skills = normalizeSkillGroups(source.skills);
  const legacySkills = skills.length > 0 ? skills : normalizeSkillGroups(source.skill_groups);

  return {
    persona: inferPersonaFromShape(source),
    personal_info: normalizePersonalInfo(source.personal_info),
    professional_summary: safeText(source.professional_summary),
    skills: legacySkills,
    internships: normalizeInternships(source.internships),
    work_experience: normalizeWorkExperience(source.work_experience),
    education: normalizeEducation(source.education),
    campus_experience: normalizeCampusExperience(source.campus_experience),
    projects: normalizeProjects(source.projects),
    awards: normalizeAwards(source.awards),
    certifications: normalizeCertifications(source.certifications),
    languages: normalizeLanguages(source.languages),
  };
}

export function buildPersonalContactLine(personalInfo: PersonalInfo): string {
  const primaryLink = [personalInfo.website, personalInfo.github, personalInfo.linkedin].map((item) => safeText(item)).find(Boolean);
  const parts = [personalInfo.phone, personalInfo.email, personalInfo.location, primaryLink].map((item) => safeText(item)).filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return safeText(personalInfo.contact);
}

export function buildPersonalContactDetails(personalInfo: PersonalInfo) {
  return {
    phone: safeText(personalInfo.phone),
    location: safeText(personalInfo.location),
    email: safeText(personalInfo.email),
    primaryLink: [personalInfo.website, personalInfo.github, personalInfo.linkedin].map((item) => safeText(item)).find(Boolean) ?? "",
  };
}

export function buildProfessionalSkillGroups(data: ResumeData): ProfessionalSkillGroup[] {
  return data.skills
    .map((group) => ({
      category: safeText(group.category) || "核心技能",
      items: group.items.map((item) => safeText(item)).filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenProfessionalSkills(data: ResumeData): string[] {
  return buildProfessionalSkillGroups(data).flatMap((group) => group.items);
}

export function buildSkillHighlights(data: ResumeData): string[] {
  const skills = flattenProfessionalSkills(data);
  const certifications = buildCredentialHighlights(data);

  return [...new Set([...skills, ...certifications])];
}

export function buildCredentialHighlights(data: ResumeData): string[] {
  const certifications = data.certifications
    .map((item) => safeText(item.name))
    .filter(Boolean);
  const languages = data.languages
    .map((item) => [item.name, item.proficiency].map((part) => safeText(part)).filter(Boolean).join(" | "))
    .filter(Boolean);

  return [...new Set([...certifications, ...languages])];
}

export function buildProfessionalSkills(data: ResumeData): string[] {
  return flattenProfessionalSkills(data);
}

function joinNonEmpty(parts: Array<string | undefined>): string {
  return parts.map((part) => safeText(part)).filter(Boolean).join(" | ");
}

function pushSection(lines: string[], title: string, entries: string[]) {
  if (entries.length === 0) {
    return;
  }

  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(`${title}:`);
  lines.push(...entries);
}

export function buildMachineReadableResumeText(data: ResumeData): string {
  const lines: string[] = [];
  const contactLine = buildPersonalContactLine(data.personal_info);
  const skillGroups = buildProfessionalSkillGroups(data);
  const credentialHighlights = buildCredentialHighlights(data);

  if (safeText(data.personal_info.name)) {
    lines.push(`NAME: ${safeText(data.personal_info.name)}`);
  }

  if (safeText(data.personal_info.headline)) {
    lines.push(`HEADLINE: ${safeText(data.personal_info.headline)}`);
  }

  if (contactLine) {
    lines.push(`CONTACT: ${contactLine}`);
  }

  lines.push(`PERSONA: ${data.persona}`);

  if (safeText(data.professional_summary)) {
    pushSection(lines, "SUMMARY", [safeText(data.professional_summary)]);
  }

  pushSection(
    lines,
    "SKILLS",
    skillGroups.map((group) => `- ${safeText(group.category)}: ${group.items.join(", ")}`),
  );

  pushSection(
    lines,
    "EDUCATION",
    data.education.map((item) => `- ${joinNonEmpty([item.school, item.major, item.degree, item.duration])}`),
  );

  pushSection(
    lines,
    "INTERNSHIPS",
    data.internships.flatMap((item) => [
      `- ${joinNonEmpty([item.role, item.company, item.duration])}`,
      ...item.achievements.map((achievement) => `  * ${achievement}`),
    ]),
  );

  pushSection(
    lines,
    "WORK EXPERIENCE",
    data.work_experience.flatMap((item) => [
      `- ${joinNonEmpty([item.role, item.company, item.duration])}`,
      ...item.achievements.map((achievement) => `  * ${achievement}`),
    ]),
  );

  pushSection(
    lines,
    "PROJECTS",
    data.projects.flatMap((item) => [
      `- ${joinNonEmpty([item.name, item.role, item.duration])}`,
      ...item.highlights.map((highlight) => `  * ${highlight}`),
    ]),
  );

  pushSection(
    lines,
    "CAMPUS EXPERIENCE",
    data.campus_experience.flatMap((item) => [
      `- ${joinNonEmpty([item.role, item.organization, item.duration])}`,
      ...item.highlights.map((highlight) => `  * ${highlight}`),
    ]),
  );

  pushSection(
    lines,
    "AWARDS",
    data.awards.map((item) => `- ${joinNonEmpty([item.name, item.issuer, item.date, item.detail])}`),
  );

  pushSection(
    lines,
    "CREDENTIALS",
    credentialHighlights.map((item) => `- ${item}`),
  );

  return lines.join("\n").trim();
}

export function toMultilineText(items: string[]): string {
  return items.join("\n");
}

export function parseMultilineText(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
