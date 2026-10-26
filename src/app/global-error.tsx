"use client";

// Error di root layout: halaman mandiri tanpa style global. Tidak menampilkan detail error.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "1rem",
          color: "#0f1e2c",
          background: "#f6f9fb",
        }}
      >
        <title>Terjadi kesalahan</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem" }}>Terjadi kesalahan</h1>
          <p style={{ color: "#526273" }}>
            Halaman gagal dimuat. Coba lagi, atau laporkan ke admin klub
            {error.digest ? ` dengan kode ${error.digest}` : ""}.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: 0,
              background: "#0b6fa4",
              color: "white",
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
