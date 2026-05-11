import type { ResumeData } from "@/components/templates/types";
import { buildResumeTemplateSections, buildResumeContactItems, type ResumeTemplateSection } from "@/lib/resume-view-model";
import { cn } from "@/lib/utils";

type TextHeaderProps = {
  data: ResumeData;
  align?: "left" | "center";
  nameClassName?: string;
  headlineClassName?: string;
  contactClassName?: string;
  wrapperClassName?: string;
};

type SectionHeadingProps = {
  title: string;
  titleClassName?: string;
  ruleClassName?: string;
  wrapperClassName?: string;
};

type SectionContentProps = {
  section: ResumeTemplateSection;
  entryVariant?: "default" | "timeline" | "split";
  textClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  entryWrapperClassName?: string;
  entryClassName?: string;
  entryHeaderClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  metaClassName?: string;
  bulletListClassName?: string;
  listLimit?: number;
};

type SectionPanelProps = SectionContentProps & {
  title: string;
  headingTitleClassName?: string;
  headingRuleClassName?: string;
  headingWrapperClassName?: string;
};

export function buildTemplateSections(data: ResumeData) {
  return buildResumeTemplateSections(data);
}

export function TextResumeHeader({
  data,
  align = "left",
  nameClassName,
  headlineClassName,
  contactClassName,
  wrapperClassName,
}: TextHeaderProps) {
  const contacts = buildResumeContactItems(data);
  const alignmentClassName = align === "center" ? "text-center" : "text-left";

  return (
    <header className={cn(alignmentClassName, wrapperClassName)}>
      <h1 className={cn("text-[28px] font-bold tracking-[0.02em] text-slate-900", nameClassName)}>
        {data.personal_info.name || "Candidate"}
      </h1>
      {data.personal_info.headline ? (
        <p className={cn("mt-1 text-[11px] font-medium tracking-[0.08em] text-slate-600 uppercase", headlineClassName)}>
          {data.personal_info.headline}
        </p>
      ) : null}
      {contacts.length > 0 ? (
        <p className={cn("mt-2 text-[10px] leading-[1.6] text-slate-600", contactClassName)}>{contacts.join(" | ")}</p>
      ) : null}
    </header>
  );
}

export function SectionHeading({ title, titleClassName, ruleClassName, wrapperClassName }: SectionHeadingProps) {
  return (
    <div className={cn("mb-2 flex items-center gap-2", wrapperClassName)}>
      <h2 className={cn("text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800", titleClassName)}>{title}</h2>
      <span className={cn("h-px flex-1 bg-slate-300", ruleClassName)} />
    </div>
  );
}

function isVerboseGroupedItem(item: string) {
  const normalized = item.trim();
  return normalized.length > 22 || /[,.;:()]/.test(normalized);
}

export function TemplateSectionContent({
  section,
  entryVariant = "default",
  textClassName,
  listClassName,
  itemClassName,
  entryWrapperClassName,
  entryClassName,
  entryHeaderClassName,
  titleClassName,
  subtitleClassName,
  metaClassName,
  bulletListClassName,
  listLimit = 10,
}: SectionContentProps) {
  if (section.type === "text") {
    return <p className={cn("text-[10px] leading-[1.7] text-slate-700", textClassName)}>{section.text}</p>;
  }

  if (section.type === "list") {
    return (
      <ul className={cn("list-disc space-y-1 pl-4 text-[10px] leading-[1.6] text-slate-700", listClassName)}>
        {section.items.slice(0, listLimit).map((item) => (
          <li key={item} className={itemClassName}>
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (section.type === "grouped-list") {
    const hideGroupLabels = section.groups.length === 1;

    return (
      <div className={cn("space-y-2.5", entryWrapperClassName)}>
        {section.groups.map((group) => {
          const visibleItems = group.items.slice(0, listLimit);
          const useBadgeLayout = visibleItems.every((item) => !isVerboseGroupedItem(item));

          return (
            <div key={group.label} className={entryClassName}>
            {!hideGroupLabels ? (
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500", metaClassName)}>
                {group.label}
              </p>
            ) : null}
            {useBadgeLayout ? (
              <div className={cn(hideGroupLabels ? "flex flex-wrap gap-1.5" : "mt-1.5 flex flex-wrap gap-1.5")}>
                {visibleItems.map((item) => (
                  <span
                    key={item}
                    className={cn(
                      "rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium leading-[1.35] text-slate-700",
                      textClassName,
                    )}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <ul
                className={cn(
                  hideGroupLabels ? "space-y-1.5" : "mt-1.5 space-y-1.5",
                  listClassName,
                )}
              >
                {visibleItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span className={cn("text-[10px] leading-[1.7] text-slate-700", textClassName)}>{item}</span>
                  </li>
                ))}
              </ul>
            )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", entryWrapperClassName)}>
      {section.entries.map((entry) => {
        const entryKey = `${entry.title}-${entry.subtitle}-${entry.meta}`;

        if (entryVariant === "timeline") {
          return (
            <div key={entryKey} className={cn("border-l-2 border-slate-200 pl-3", entryClassName)}>
              {entry.meta ? (
                <p className={cn("text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500", metaClassName)}>{entry.meta}</p>
              ) : null}
              <div className={cn("mt-0.5", entryHeaderClassName)}>
                <p className={cn("text-[11px] font-semibold text-slate-900", titleClassName)}>{entry.title}</p>
                {entry.subtitle ? <p className={cn("text-[10px] text-slate-600", subtitleClassName)}>{entry.subtitle}</p> : null}
              </div>
              {entry.bullets && entry.bullets.length > 0 ? (
                <ul className={cn("mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-[1.6] text-slate-700", bulletListClassName)}>
                  {entry.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        }

        if (entryVariant === "split") {
          return (
            <div key={entryKey} className={cn("grid grid-cols-[110px_minmax(0,1fr)] gap-3", entryClassName)}>
              <div className={cn("text-[10px] font-semibold text-slate-500", metaClassName)}>{entry.meta || ""}</div>
              <div className={entryHeaderClassName}>
                <p className={cn("text-[11px] font-semibold text-slate-900", titleClassName)}>{entry.title}</p>
                {entry.subtitle ? <p className={cn("text-[10px] text-slate-600", subtitleClassName)}>{entry.subtitle}</p> : null}
                {entry.bullets && entry.bullets.length > 0 ? (
                  <ul className={cn("mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-[1.6] text-slate-700", bulletListClassName)}>
                    {entry.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          );
        }

        return (
          <div key={entryKey} className={entryClassName}>
            <div className={cn("flex items-start justify-between gap-3", entryHeaderClassName)}>
              <div className="min-w-0">
                <p className={cn("text-[11px] font-semibold text-slate-900", titleClassName)}>{entry.title}</p>
                {entry.subtitle ? <p className={cn("text-[10px] text-slate-600", subtitleClassName)}>{entry.subtitle}</p> : null}
              </div>
              {entry.meta ? <p className={cn("shrink-0 text-[10px] font-semibold text-slate-500", metaClassName)}>{entry.meta}</p> : null}
            </div>
            {entry.bullets && entry.bullets.length > 0 ? (
              <ul className={cn("mt-1 list-disc space-y-0.5 pl-4 text-[10px] leading-[1.6] text-slate-700", bulletListClassName)}>
                {entry.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function TemplateSectionPanel({
  title,
  headingTitleClassName,
  headingRuleClassName,
  headingWrapperClassName,
  ...contentProps
}: SectionPanelProps) {
  return (
    <section>
      <SectionHeading
        title={title}
        titleClassName={headingTitleClassName}
        ruleClassName={headingRuleClassName}
        wrapperClassName={headingWrapperClassName}
      />
      <TemplateSectionContent {...contentProps} />
    </section>
  );
}
