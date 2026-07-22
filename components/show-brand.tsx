import Link from "next/link";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        <b>$</b>
      </span>
      <span>HOLDERS <em>DILEMMA</em><span>$DILEMMA</span></span>
    </Link>
  );
}
