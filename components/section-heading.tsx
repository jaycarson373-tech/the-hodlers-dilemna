type SectionHeadingProps = {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionHeading({
  number,
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <header className="section-heading">
      <div className="section-index" aria-hidden="true">
        {number} / {eyebrow}
      </div>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </div>
    </header>
  );
}
