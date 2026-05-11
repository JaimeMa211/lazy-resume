import type { ResumeData } from "@/components/templates/types";
import { buildTemplateSections, TemplateSectionPanel, TextResumeHeader } from "@/components/templates/TemplateBlocks";
import { flattenProfessionalSkills } from "@/lib/resume-data";

type StudentTemplateProps = {
  data: ResumeData;
};

export function StudentTemplate({ data }: StudentTemplateProps) {
  const sections = buildTemplateSections(data);
  const accentSkills = flattenProfessionalSkills(data).slice(0, 6);

  return (
    <article className="h-full bg-[#fffdfa] px-8 py-6 text-[10px] leading-[1.6] text-slate-800">
      <header className="border-b border-[#f0d7c7] pb-4">
        <TextResumeHeader
          data={data}
          nameClassName="text-[32px] tracking-tight text-[#8c4a24]"
          headlineClassName="text-[11px] tracking-[0.16em] text-[#b96a38]"
          contactClassName="text-[10px] text-[#735244]"
        />
        {accentSkills.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {accentSkills.map((skill) => (
              <span key={skill} className="rounded-full bg-[#fff0e5] px-2.5 py-1 text-[10px] font-semibold text-[#9f5830]">
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-4 space-y-3">
        {sections.map((section) => (
          <TemplateSectionPanel
            key={section.id}
            title={section.title}
            section={section}
            headingTitleClassName="text-[10px] tracking-[0.22em] text-[#8c4a24]"
            headingRuleClassName="bg-[#efcdb9]"
            titleClassName="text-slate-900"
            subtitleClassName="text-slate-600"
            metaClassName="text-[#b96a38]"
          />
        ))}
      </div>
    </article>
  );
}
