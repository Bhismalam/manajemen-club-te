import { AtSign, Clock, Mail, MapPin, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { PageIntro, Section } from "@/components/public/public-blocks";
import { buttonVariants } from "@/components/ui/button";
import { SITE, whatsappUrl } from "@/constants/site";

export const metadata: Metadata = {
  title: "Kontak",
  description: `Hubungi ${SITE.name} untuk informasi program dan pendaftaran anggota.`,
};

export default function ContactPage() {
  const { contact } = SITE;
  const items = [
    {
      icon: MapPin,
      label: "Tempat latihan",
      value: `${contact.venue}, ${contact.address}`,
      href: contact.mapsUrl,
      external: true,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: contact.phoneDisplay,
      href: whatsappUrl(),
      external: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
      external: false,
    },
    {
      icon: AtSign,
      label: "Instagram",
      value: `@${contact.instagram}`,
      href: `https://instagram.com/${contact.instagram}`,
      external: true,
    },
    { icon: Clock, label: "Jam layanan", value: contact.officeHours, href: null, external: false },
  ];
  return (
    <>
      <PageIntro
        eyebrow="Kontak"
        title="Hubungi kami"
        description="Tanya jadwal uji coba latihan, biaya, atau pendaftaran anggota. Kami biasanya membalas di hari yang sama."
      />
      <Section title="Informasi kontak">
        <div className="grid gap-8 md:grid-cols-[3fr_2fr]">
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {items.map((item) => (
              <li key={item.label} className="flex gap-4 p-5">
                <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.href ? (
                    <a
                      href={item.href}
                      {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="font-medium underline-offset-4 hover:text-primary hover:underline"
                    >
                      {item.value}
                    </a>
                  ) : (
                    <span className="font-medium">{item.value}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 self-start rounded-2xl bg-primary p-6 text-primary-foreground">
            <h2 className="font-heading text-xl font-bold">Cara tercepat: WhatsApp</h2>
            <p className="text-primary-foreground/85">
              Ceritakan usia dan pengalaman renang calon atlet, kami bantu pilihkan program yang
              cocok.
            </p>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "secondary", className: "self-start" })}
            >
              <MessageCircle />
              Chat WhatsApp
            </a>
          </div>
        </div>
      </Section>
    </>
  );
}
