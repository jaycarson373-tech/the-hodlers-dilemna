import Link from "next/link";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hodl-no-hodl-logo-v2.jpg" alt="" width="1254" height="1254" />
      </span>
      <span>HODL <em>OR</em> NO HODL<span>.FUN</span></span>
    </Link>
  );
}
