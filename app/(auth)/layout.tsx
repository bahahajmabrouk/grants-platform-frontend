export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background: #0d1117;
          color: #e6edf3;
          font-family: 'Segoe UI', system-ui, sans-serif;
        }

        html {
          background: #0d1117;
        }
      `}</style>

      {/* NAV */}
      <nav
        style={{
          borderBottom: "1px solid #21262d",
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(13,17,23,0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #238636, #2ea043)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            🚀
          </div>
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "white",
            }}
          >
            Grants Platform
          </span>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div
        style={{
          padding: "60px 40px 40px",
          maxWidth: "900px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(35, 134, 54, 0.1)",
            border: "1px solid rgba(35, 134, 54, 0.3)",
            color: "#3fb950",
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "20px",
            marginBottom: "20px",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#3fb950",
            }}
          ></div>
          Authentification
        </div>

        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            lineHeight: 1.2,
            color: "white",
            marginBottom: "12px",
          }}
        >
          Accès à la plateforme <span style={{ color: "#3fb950" }}>Grants</span>
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#7d8590",
            lineHeight: 1.6,
            maxWidth: "500px",
          }}
        >
          Connectez-vous ou créez un compte pour accéder à la plateforme de recherche de grants.
        </p>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          flex: 1,
          maxWidth: "900px",
          margin: "0 auto",
          padding: "40px 40px 80px",
          width: "100%",
        }}
      >
        {children}
      </div>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid #21262d",
          padding: "24px 40px",
          textAlign: "center",
          fontSize: "12px",
          color: "#7d8590",
          background: "rgba(13,17,23,0.5)",
        }}
      >
        © 2026 Grants Platform. Tous les droits réservés.
      </footer>
    </div>
  );
}