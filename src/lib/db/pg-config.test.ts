import { afterEach, describe, expect, it } from "vitest";

import { pgConfig } from "./pg-config";

const URL_WITH_SSL =
  "postgresql://user:pw@db.example.supabase.co:6543/postgres?sslmode=require&pgbouncer=true";

describe("pgConfig", () => {
  afterEach(() => {
    delete process.env.DATABASE_CA_CERT;
  });

  it("tanpa CA: URL dipakai apa adanya (Postgres lokal)", () => {
    expect(pgConfig("postgresql://u@localhost:5432/db")).toEqual({
      connectionString: "postgresql://u@localhost:5432/db",
    });
  });

  it("dengan CA: TLS terverifikasi dan parameter ssl di URL dibuang", () => {
    process.env.DATABASE_CA_CERT = "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----";
    const config = pgConfig(URL_WITH_SSL);
    expect(config.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
      rejectUnauthorized: true,
    });
    expect(config.connectionString).not.toContain("sslmode");
    expect(config.connectionString).toContain("pgbouncer=true");
  });
});
