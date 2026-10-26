import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";

import { createAthlete, createCoach, createGroup } from "./factories";
import { databaseName } from "./test-database";

describe("infrastruktur integration test", () => {
  it("memakai database test, bukan development", async () => {
    const [row] = await prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;
    expect(row?.name.endsWith("_test")).toBe(true);
    expect(databaseName(process.env.DATABASE_URL!)).toBe(row?.name);
  });

  it("database dikosongkan sebelum setiap test", async () => {
    const coach = await createCoach();
    const group = await createGroup(coach.id);
    await createAthlete({ groupId: group.id });
    expect(await prisma.athleteProfile.count()).toBe(1);
  });

  it("test berikutnya mulai dari kosong", async () => {
    expect(await prisma.athleteProfile.count()).toBe(0);
  });
});
