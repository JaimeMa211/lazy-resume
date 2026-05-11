import { PersonalInfoHeader } from "@/components/templates/PersonalInfoHeader";
import type { ResumeData } from "@/components/templates/types";
import { buildResumeTemplateSections, type ResumeTemplateSection } from "@/lib/resume-view-model";

type HarvardTemplateProps = {
  data: ResumeData;
};

function sectionBadge(title: string) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="inline-flex min-w-24 items-center bg-[#4B6A79] px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-white">{title}</span>
      <span className="h-px flex-1 bg-[#A7B4BD]" />
    </div>
  );
}

function renderSection(section: ResumeTemplateSection) {
  if (section.type === "text") {
    return <p className="text-[10px] leading-[1.75] text-[#505D67]">{section.text}</p>;
  }

  if (section.type === "list") {
    return (
      <ul className="list-disc space-y-0.5 pl-5">
        {section.items.slice(0, 10).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (section.type === "grouped-list") {
    const hideGroupLabels = section.groups.length === 1;

    return (
      <div className="space-y-2 pl-1">
        {section.groups.map((group) => (
          <div key={group.label}>
            {!hideGroupLabels ? <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#4B6A79]">{group.label}</p> : null}
            <ul className={hideGroupLabels ? "space-y-1.5" : "mt-1.5 space-y-1.5"}>
              {group.items.slice(0, 10).map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7f96a3]" />
                  <span className="text-[10px] leading-[1.7] text-[#505D67]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (section.id === "awards") {
    return (
      <div className="space-y-1.5 pl-1">
        {section.entries.map((entry) => (
          <div key={`${entry.title}-${entry.subtitle}-${entry.meta}`} className="grid grid-cols-[minmax(0,1fr)_72px] items-start gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#2F3C45]">{entry.title}</p>
              {entry.subtitle ? <p className="truncate text-[#5A6670]">{entry.subtitle}</p> : null}
            </div>
            {entry.meta ? <p className="text-right text-[11px] font-semibold text-[#2F3C45]">{entry.meta}</p> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-1">
      {section.entries.map((entry) => (
        <div key={`${entry.title}-${entry.subtitle}-${entry.meta}`}>
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#2F3C45]">
            <p>{entry.title}</p>
            {entry.meta ? <p>{entry.meta}</p> : null}
          </div>
          {entry.subtitle ? <p className="mb-1 text-[#5A6670]">{entry.subtitle}</p> : null}
          {entry.bullets && entry.bullets.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {entry.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function HarvardTemplate({ data }: HarvardTemplateProps) {
  const sections = buildResumeTemplateSections(data);

  return (
    <article className="h-full bg-[#FBFBFB] px-8 pt-4 pb-6 text-[10px] leading-[1.6] text-[#2E2E2E] print:pt-2">
      <header className="mb-4 border-b border-[#9AA8B3] pb-3 print:mb-3">
        <PersonalInfoHeader
          data={data}
          className="grid-cols-[88px_minmax(170px,220px)_minmax(0,1fr)] gap-5"
          nameClassName="text-[38px] font-black text-[#30343A]"
          headlineClassName="mt-1.5 text-[12px] font-semibold text-[#54626C]"
          photoClassName="h-24 w-20 border border-[#C7D0D6] bg-[#E7ECEF]"
          photoPlaceholderClassName="bg-[#E7ECEF] text-[#7A8993]"
          infoGridClassName="gap-x-5 gap-y-2"
          itemIconClassName="text-[#54626C]"
          itemTextClassName="text-[10px] text-[#4D5A63]"
          emptyClassName="text-[10px] text-[#4D5A63]"
        />
      </header>

      <div className="space-y-3">
        {sections.map((section) => (
          <section key={section.id}>
            {sectionBadge(section.title)}
            {renderSection(section)}
          </section>
        ))}
      </div>
    </article>
  );
}
