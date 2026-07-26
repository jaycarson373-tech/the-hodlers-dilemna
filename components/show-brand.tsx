import Link from "next/link";
import { TICKER } from "@/lib/constants";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/onchain-bingo-logo.svg" alt="" width="76" height="76" decoding="async" />
      </span>
      <span>ON-CHAIN <em>BINGO</em><span>{TICKER}</span></span>
    </Link>
  );
}
