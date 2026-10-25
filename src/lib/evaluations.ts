// Aturan evaluasi (fungsi murni).

export const EVALUATION_DUE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

// Atlet perlu dievaluasi jika belum pernah, atau evaluasi terakhir lebih dari 30 hari lalu.
// `lastEvaluationDate` adalah kolom @db.Date (tengah malam UTC).
export function isEvaluationDue(
  lastEvaluationDate: Date | null,
  now = new Date(),
  days = EVALUATION_DUE_DAYS,
): boolean {
  if (!lastEvaluationDate) return true;
  return now.getTime() - lastEvaluationDate.getTime() > days * DAY_MS;
}
