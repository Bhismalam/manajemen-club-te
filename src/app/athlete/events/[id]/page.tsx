import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  closedRegistrationMessage,
  EventSummary,
} from "@/features/competition-registrations/event-summary";
import { RegistrationEditor } from "@/features/competition-registrations/registration-editor";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getAthleteEventView } from "@/services/competition-registration-service";

export const metadata: Metadata = { title: "Detail Event" };

export default function AthleteEventPage({ params }: PageProps<"/athlete/events/[id]">) {
  return (
    <>
      <Link
        href="/athlete/events"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Semua event
      </Link>
      <Suspense fallback={<PageSkeleton />}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function loadView(...args: Parameters<typeof getAthleteEventView>) {
  try {
    return await getAthleteEventView(...args);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function Content({ params }: { params: PageProps<"/athlete/events/[id]">["params"] }) {
  const actor = await requireActor("ATHLETE");
  const { id } = await params;
  const now = new Date();
  const { competition, athlete, isOpen } = await loadView(actor, id, now);

  return (
    <>
      <PageHeader title={competition.name} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="self-start lg:col-span-2">
          <CardHeader>
            <CardTitle>Info event</CardTitle>
          </CardHeader>
          <CardContent>
            <EventSummary event={competition} now={now} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pendaftaran saya</CardTitle>
            <CardDescription>
              Pilih nomor lomba yang ingin kamu ikuti. Seed time diambil otomatis dari PB-mu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationEditor
              competitionId={competition.id}
              disciplines={competition.disciplines}
              athletes={athlete ? [athlete] : []}
              mode="self"
              canEdit={isOpen}
              closedMessage={closedRegistrationMessage(competition, now)}
              maxEntries={competition.maxEntriesPerAthlete}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
