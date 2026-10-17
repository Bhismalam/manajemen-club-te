// Kebijakan murni & scope query (aman di-import dari mana saja, termasuk test).
// Untuk actor dan guard yang mengakses database, import langsung dari
// "@/lib/permissions/actor" dan "@/lib/permissions/guards" (khusus server).
export * from "./policies";
export * from "./scopes";
export type * from "./types";
