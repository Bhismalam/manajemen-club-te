// URL database khusus test. Dipakai integration test & E2E; TIDAK PERNAH database development.
// Urutan: TEST_DATABASE_URL, atau DATABASE_URL dengan nama database + "_test".
export function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!explicit && !base) throw new Error("Set DATABASE_URL atau TEST_DATABASE_URL di .env.local");

  const url = new URL(explicit ?? base!);
  if (!explicit) url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;

  const name = url.pathname.slice(1);
  // Pengaman: test menghapus seluruh isi database, jadi namanya wajib berakhiran _test.
  if (!name.endsWith("_test")) {
    throw new Error(`Database test harus berakhiran "_test" (dapat "${name}").`);
  }
  return url.toString();
}

export function databaseName(url: string): string {
  return new URL(url).pathname.slice(1);
}
