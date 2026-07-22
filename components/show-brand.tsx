import Link from "next/link";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/holders-dilemma-logo-small.jpg" alt="" width="76" height="76" decoding="async" />
      </span>
      <span>HOLDERS <em>DILEMMA</em><span>$DILEMMA</span></span>
    </Link>
  );
}
