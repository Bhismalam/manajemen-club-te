import type { EditorAthlete } from "@/services/competition-registration-service";

// Ringkasan atlet (dalam daftar yang dikelola) yang sudah terdaftar beserta nomor lombanya.
export function RegisteredAthleteList({
  athletes,
  disciplines,
}: {
  athletes: EditorAthlete[];
  disciplines: { id: string; name: string }[];
}) {
  const nameOf = new Map(disciplines.map((d) => [d.id, d.name]));
  const registered = athletes.filter((a) => a.registration?.status === "REGISTERED");

  if (registered.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada atlet yang terdaftar.</p>;
  }

  return (
    <ul className="flex flex-col divide-y text-sm">
      {registered.map((athlete) => (
        <li key={athlete.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
          <span className="font-medium">{athlete.fullName}</span>
          <span className="text-muted-foreground">
            {athlete.registration!.disciplineIds.map((id) => nameOf.get(id) ?? "?").join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
