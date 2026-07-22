import Link from "next/link";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        <i>?</i>
      </span>
      <span>HODL <em>OR</em> NO HODL<span>.FUN</span></span>
    </Link>
  );
}
