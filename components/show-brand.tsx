import Link from "next/link";
import { TICKER } from "@/lib/constants";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bingo-logo.jpg" alt="" width="900" height="900" decoding="async" />
      </span>
      <span>BINGO<em>.FUN</em><span>{TICKER}</span></span>
    </Link>
  );
}
