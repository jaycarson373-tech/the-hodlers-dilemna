import Link from "next/link";
import { TICKER } from "@/lib/constants";

export function ShowBrand({ href = "/" }: { href?: string }) {
  return (
    <Link className="show-brand" href={href}>
      <span className="show-brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/royal-bingo-mark.png" alt="" width="1254" height="1254" decoding="async" />
      </span>
      <span className="show-brand-word">BINGO<em> ROYALE</em><span>{TICKER} · THE BLUE HALL</span></span>
    </Link>
  );
}
