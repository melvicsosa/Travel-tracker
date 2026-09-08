import Link from "next/link";
import { t } from "@/lib/i18n";

/** Wordmark; swaps to the cream version on dark backgrounds via CSS. */
export function Logo({ href = "/trips", height = 36 }: { href?: string; height?: number }) {
  const img = (variant: "light" | "dark") => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={variant}
      src={`/brand/logo-${variant}.png`}
      srcSet={`/brand/logo-${variant}.png 1x, /brand/logo-${variant}@2x.png 2x`}
      alt={t.app.name}
      style={{ height }}
    />
  );
  return (
    <Link href={href} className="logo" aria-label={t.app.name}>
      {img("light")}
      {img("dark")}
    </Link>
  );
}
