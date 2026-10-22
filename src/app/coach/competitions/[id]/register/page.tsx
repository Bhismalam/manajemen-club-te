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
import { RegisteredAthleteList } from "@/features/competition-registrations/registered-athlete-list";
import { RegistrationEditor } from "@/features/competition-registrations/registration-editor";
import { isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getRegistrationBoard } from "@/services/competition-registration-service";

export const metadata: Metadata = { title: "Daftarkan Atlet" };

export default function CoachRegisterPage({
  params,
}: PageProps<"/coach/competitions/[id]/register">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function loadBoard(...args: Parameters<typeof getRegistrationBoard>) {
  try {
    return await getRegistrationBoard(...args);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }
}

async function Content({
  params,
}: {
  params: PageProps<"/coach/competitions/[id]/register">["params"];
}) {
  const actor = await requireActor("COACH");
  const { id } = await params;
  const now = new Date();
  const { competition, athletes, isOpen } = await loadBoard(actor, id, now);
  if (competition.status === "DRAFT") notFound();

  return (
    <>
      <Link
        href={`/coach/competitions/${competition.id}`}
        className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2 self-start" })}
      >
        <ChevronLeft />
        Detail event
      </Link>
      <PageHeader title="Daftarkan atlet binaan" description={competition.name} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Info event</CardTitle>
            </CardHeader>
            <CardContent>
              <EventSummary event={competition} now={now} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Atlet binaan terdaftar</CardTitle>
            </CardHeader>
            <CardContent>
              <RegisteredAthleteList athletes={athletes} disciplines={competition.disciplines} />
            </CardContent>
          </Card>
        </div>
        <Card className="self-start lg:col-span-3">
          <CardHeader>
            <CardTitle>Pendaftaran</CardTitle>
            <CardDescription>
              Pilih atlet, centang nomor lombanya, lalu simpan. Seed time diambil dari PB atlet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegistrationEditor
              competitionId={competition.id}
              disciplines={competition.disciplines}
              athletes={athletes}
              mode="managed"
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
