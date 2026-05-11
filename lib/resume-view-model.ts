import type { ResumeData, ResumeModuleId } from "@/components/templates/types";
import { buildCredentialHighlights, buildPersonalContactLine, buildProfessionalSkillGroups } from "@/lib/resume-data";
import { getModuleLabel, getResumePersonaDefinition } from "@/lib/resume-personas";

export type ResumeTemplateEntry = {
  title: string;
  subtitle?: string;
  meta?: string;
  bullets?: string[];
};

export type ResumeTemplateSection =
  | {
      id: ResumeModuleId;
      title: string;
      type: "text";
      text: string;
    }
  | {
      id: ResumeModuleId;
      title: string;
      type: "list";
      items: string[];
    }
  | {
      id: ResumeModuleId;
      title: string;
      type: "grouped-list";
      groups: Array<{ label: string; items: string[] }>;
    }
  | {
      id: ResumeModuleId;
      title: string;
      type: "entries";
      entries: ResumeTemplateEntry[];
    };

function buildSummarySection(data: ResumeData): ResumeTemplateSection | null {
  if (!data.professional_summary.trim()) {
    return null;
  }

  return {
    id: "summary",
    title: getResumePersonaDefinition(data.persona).summaryTitle,
    type: "text",
    text: data.professional_summary.trim(),
  };
}

function buildSkillsSection(data: ResumeData): ResumeTemplateSection | null {
  const groups = buildProfessionalSkillGroups(data);
  if (groups.length === 0) {
    return null;
  }

  return {
    id: "skills",
    title: getModuleLabel(data.persona, "skills"),
    type: "grouped-list",
    groups: groups.map((group) => ({
      label: group.category,
      items: group.items,
    })),
  };
}

function buildEducationSection(data: ResumeData): ResumeTemplateSection | null {
  if (data.education.length === 0) {
    return null;
  }

  return {
    id: "education",
    title: getModuleLabel(data.persona, "education"),
    type: "entries",
    entries: data.education.map((item) => ({
      title: item.school,
      subtitle: [item.major, item.degree].filter(Boolean).join(" | "),
      meta: item.duration,
    })),
  };
}

function buildExperienceSection(
  data: ResumeData,
  id: "internships" | "work" | "projects" | "campus" | "awards",
): ResumeTemplateSection | null {
  if (id === "internships" && data.internships.length > 0) {
    return {
      id,
      title: getModuleLabel(data.persona, id),
      type: "entries",
      entries: data.internships.map((item) => ({
        title: item.role || item.company,
        subtitle: item.company,
        meta: item.duration,
        bullets: item.achievements,
      })),
    };
  }

  if (id === "work" && data.work_experience.length > 0) {
    return {
      id,
      title: getModuleLabel(data.persona, id),
      type: "entries",
      entries: data.work_experience.map((item) => ({
        title: item.role || item.company,
        subtitle: item.company,
        meta: item.duration,
        bullets: item.achievements,
      })),
    };
  }

  if (id === "projects" && data.projects.length > 0) {
    return {
      id,
      title: getModuleLabel(data.persona, id),
      type: "entries",
      entries: data.projects.map((item) => ({
        title: item.name,
        subtitle: item.role,
        meta: item.duration,
        bullets: item.highlights,
      })),
    };
  }

  if (id === "campus" && data.campus_experience.length > 0) {
    return {
      id,
      title: getModuleLabel(data.persona, id),
      type: "entries",
      entries: data.campus_experience.map((item) => ({
        title: item.role || item.organization,
        subtitle: item.organization,
        meta: item.duration,
        bullets: item.highlights,
      })),
    };
  }

  if (id === "awards" && data.awards.length > 0) {
    return {
      id,
      title: getModuleLabel(data.persona, id),
      type: "entries",
      entries: data.awards.map((item) => ({
        title: item.name,
        subtitle: [item.issuer, item.detail].filter(Boolean).join(" | "),
        meta: item.date,
      })),
    };
  }

  return null;
}

function buildCredentialSection(data: ResumeData): ResumeTemplateSection | null {
  const items = buildCredentialHighlights(data);
  if (items.length === 0) {
    return null;
  }

  return {
    id: "credentials",
    title: getModuleLabel(data.persona, "credentials"),
    type: "list",
    items,
  };
}

export function buildResumeTemplateSections(data: ResumeData): ResumeTemplateSection[] {
  const personaDefinition = getResumePersonaDefinition(data.persona);

  return personaDefinition.modules
    .map((moduleRule) => moduleRule.id)
    .filter((id) => id !== "profile")
    .map((id) => {
      switch (id) {
        case "summary":
          return buildSummarySection(data);
        case "skills":
          return buildSkillsSection(data);
        case "education":
          return buildEducationSection(data);
        case "internships":
        case "campus":
        case "work":
        case "projects":
        case "awards":
          return buildExperienceSection(data, id);
        case "credentials":
          return buildCredentialSection(data);
        default:
          return null;
      }
    })
    .filter((section): section is ResumeTemplateSection => section !== null);
}

export function buildResumeContactItems(data: ResumeData, limit?: number): string[] {
  const items = buildPersonalContactLine(data.personal_info)
    .split(/[|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return typeof limit === "number" ? items.slice(0, limit) : items;
}
