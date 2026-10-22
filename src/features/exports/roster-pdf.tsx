import "server-only";

import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";

import { CLUB_TIME_ZONE_LABEL } from "@/lib/format";

import type { RosterExport } from "./roster-data";

// PDF rekap pendaftar: kop event lalu daftar peserta per nomor lomba (A4 portrait).

const NAVY = "#0B1F33";
const MUTED = "#5B6B7A";
const BORDER = "#D9E1E8";

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 48, fontSize: 9, fontFamily: "Helvetica", color: NAVY },
  header: { borderBottomWidth: 2, borderBottomColor: NAVY, paddingBottom: 8, marginBottom: 12 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, marginTop: 3 },
  meta: { fontSize: 8, color: MUTED, marginTop: 3 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    paddingVertical: 3,
  },
  headRow: { flexDirection: "row", backgroundColor: NAVY, color: "#FFFFFF", paddingVertical: 3 },
  cell: { paddingHorizontal: 3 },
  empty: { color: MUTED },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 7,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const COLUMNS = [
  { label: "No", width: "6%" },
  { label: "Nama", width: "30%" },
  { label: "No. Atlet", width: "15%" },
  { label: "JK", width: "6%" },
  { label: "Thn Lahir", width: "10%" },
  { label: "Kelompok", width: "20%" },
  { label: "Seed", width: "13%" },
] as const;

function Cells({ values }: { values: (string | number)[] }) {
  return values.map((value, i) => (
    <Text key={COLUMNS[i]!.label} style={[styles.cell, { width: COLUMNS[i]!.width }]}>
      {String(value)}
    </Text>
  ));
}

function RosterDocument({ data }: { data: RosterExport }) {
  return (
    <Document title={`Pendaftar - ${data.event.name}`} author="Swim & Finswimming Club">
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.title}>{data.event.name}</Text>
          <Text style={styles.subtitle}>
            {data.event.dates} · {data.event.location} · {data.event.level}
          </Text>
          <Text style={styles.meta}>
            {data.totals.athletes} atlet · {data.totals.entries} entry · dicetak {data.generatedAt}{" "}
            {CLUB_TIME_ZONE_LABEL}
          </Text>
        </View>

        {data.byDiscipline.length === 0 && <Text style={styles.empty}>Belum ada pendaftar.</Text>}

        {data.byDiscipline.map((group) => (
          <View key={group.name} style={styles.section}>
            <Text style={styles.sectionTitle} minPresenceAhead={40}>
              {group.name} ({group.poolLength}m) · {group.participants.length} peserta
            </Text>
            <View style={styles.headRow}>
              <Cells values={COLUMNS.map((c) => c.label)} />
            </View>
            {group.participants.map((p) => (
              <View key={`${group.name}-${p.no}`} style={styles.row} wrap={false}>
                <Cells
                  values={[
                    p.no,
                    p.fullName,
                    p.athleteNumber,
                    p.gender,
                    p.birthYear,
                    p.group,
                    p.seed,
                  ]}
                />
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Rekap pendaftar · {data.event.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function renderRosterPdf(data: RosterExport): Promise<Buffer> {
  return renderToBuffer(<RosterDocument data={data} />);
}
