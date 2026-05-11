import { PersonalInfoHeader } from "@/components/templates/PersonalInfoHeader";
import type { ResumeData } from "@/components/templates/types";
import { buildResumeTemplateSections, type ResumeTemplateSection } from "@/lib/resume-view-model";

type MinimalistTemplateProps = {
  data: ResumeData;
};

function SectionTag({ title }: { title: string }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="inline-flex min-w-24 items-center justify-center bg-[#4B6D7E] px-3 py-0.5 text-[10px] font-bold text-white">{title}</span>
      <span className="h-px flex-1 bg-[#BBC7CE]" />
    </div>
  );
}

function renderSection(section: ResumeTemplateSection) {
  if (section.type === "text") {
    return <p>{section.text}</p>;
  }

  if (section.type === "list") {
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {section.items.slice(0, 8).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (section.type === "grouped-list") {
    return (
      <div className="space-y-2">
        {section.groups.map((group) => (
          <div key={group.label} className="border-b border-[#E0E8EC] pb-1 last:border-0">
            <div className="grid grid-cols-[120px_1fr] gap-2 text-[11px]">
              <p className="font-semibold text-[#2F3B45]">{group.label}</p>
              <p className="leading-[1.6] text-[#445A67]">{group.items.join(" | ")}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {section.entries.map((entry: { title: string; subtitle?: string; meta?: string; bullets?: string[] }) => (
        <div key={`${entry.title}-${entry.subtitle}-${entry.meta}`} className="border-b border-[#E0E8EC] pb-1 last:border-0">
          <div className="grid grid-cols-[120px_1fr_130px] gap-2 text-[11px] font-semibold">
            <p>{entry.meta || ""}</p>
            <p>{entry.title}</p>
            <p className="text-right">{entry.subtitle || ""}</p>
          </div>
          {entry.bullets && entry.bullets.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4">
              {entry.bullets.map((bullet: string) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MinimalistTemplate({ data }: MinimalistTemplateProps) {
  const sections = buildResumeTemplateSections(data);

  return (
    <article className="h-full bg-white px-9 pt-4 pb-6 text-[10px] leading-[1.55] text-[#2F3B45] print:pt-2">
      <header className="mb-4 print:mb-3">
        <div className="flex items-end justify-between border-b-[6px] border-[#4E768A] pb-1">
          <div>
            <p className="text-[56px] font-black tracking-tight text-[#4C7184]">个人简历</p>
            <p className="-mt-1 text-[15px] font-semibold text-[#4C7184]">Personal resume</p>
            {data.personal_info.headline ? <p className="mt-1 text-[11px] font-semibold text-[#6C8695]">{data.personal_info.headline}</p> : null}
          </div>
          <div className="mb-2 h-5 w-40 border-b-4 border-[#B48F48]" />
        </div>
      </header>

      <section className="mb-3">
        <SectionTag title="基本信息" />
        <div className="border border-[#D4DEE4] bg-[#FAFCFD] px-3 py-2.5">
          <PersonalInfoHeader
            data={data}
            className="grid-cols-[76px_minmax(160px,200px)_minmax(0,1fr)] gap-4"
            nameClassName="text-[28px] font-bold text-[#2F3B45]"
            headlineClassName="mt-1 text-[13px] font-medium text-[#6C8695]"
            photoClassName="h-[96px] w-[76px] border border-[#C8D3DA] bg-[#E9EEF1]"
            photoPlaceholderClassName="bg-[#E9EEF1] text-[#7A8993]"
            infoGridClassName="gap-x-4 gap-y-2"
            itemIconClassName="text-[#4C7184]"
            itemTextClassName="text-[11px] text-[#445A67]"
            emptyClassName="text-[11px] text-[#6C8695]"
          />
        </div>
      </section>

      <div className="space-y-3">
        {sections.map((section) => (
          <section key={section.id}>
            <SectionTag title={section.title} />
            {renderSection(section)}
          </section>
        ))}
      </div>
    </article>
  );
}
