import { Images } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";

import { EmptyState } from "@/components/shared/empty-state";
import { PageIntro, Section } from "@/components/public/public-blocks";
import { SITE } from "@/constants/site";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Foto latihan dan kejuaraan.",
};

export default function GalleryPage() {
  return (
    <>
      <PageIntro eyebrow="Galeri" title="Momen latihan & lomba" />
      <Section title="Foto">
        {SITE.gallery.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Galeri segera hadir"
            description="Foto latihan dan kejuaraan akan ditampilkan di sini."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {SITE.gallery.map((photo) => (
              <figure key={photo.src} className="flex flex-col gap-2">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-sm text-muted-foreground">{photo.alt}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
