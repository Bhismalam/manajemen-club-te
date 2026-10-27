import "server-only";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

// Provider email belum dipilih (lihat doc/TASK.md). Di development, email "dikirim"
// ke log server agar alur reset password tetap bisa diuji. Di production belum ada pengiriman
// email: lupa password ditangani admin lewat "Buat password sementara".
export function isEmailEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!isEmailEnabled()) {
    throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  }

  console.info(
    [
      "",
      "──── [dev email] ────",
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      "",
      message.text,
      "─────────────────────",
      "",
    ].join("\n"),
  );
}
