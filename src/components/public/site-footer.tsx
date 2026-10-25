import { AtSign, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/dashboard/brand-mark";
import { PUBLIC_NAV, SITE, whatsappUrl } from "@/constants/site";

export function SiteFooter() {
  const { contact } = SITE;
  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 font-heading text-lg font-bold text-white">
            <BrandMark className="size-6" />
            {SITE.name}
          </span>
          <p className="text-sm text-sidebar-foreground/80">{SITE.tagline}</p>
        </div>

        <nav aria-label="Tautan footer" className="grid grid-cols-2 gap-2 text-sm">
          {PUBLIC_NAV.filter((item) => item.href !== "/gallery" || SITE.gallery.length > 0).map(
            (item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm text-sidebar-foreground/80 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ),
          )}
          <Link
            href="/login"
            className="rounded-sm text-sidebar-foreground/80 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
          >
            Masuk anggota
          </Link>
        </nav>

        <ul className="flex flex-col gap-3 text-sm text-sidebar-foreground/80">
          <li className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              {contact.venue}
              <br />
              {contact.address}
            </span>
          </li>
          <li>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Phone className="size-4" aria-hidden="true" />
              {contact.phoneDisplay} (WhatsApp)
            </a>
          </li>
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail className="size-4" aria-hidden="true" />
              {contact.email}
            </a>
          </li>
          <li>
            <a
              href={`https://instagram.com/${contact.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-sm outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AtSign className="size-4" aria-hidden="true" />
              Instagram @{contact.instagram}
            </a>
          </li>
        </ul>
      </div>
      <div className="border-t border-sidebar-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-sidebar-foreground/60 md:px-8">
          © {SITE.foundedYear}–sekarang {SITE.name}
        </p>
      </div>
    </footer>
  );
}
