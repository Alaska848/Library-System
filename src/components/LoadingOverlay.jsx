export default function LoadingOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px 32px",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          className="spinner-border"
          style={{ color: "#633a19", width: 24, height: 24 }}
        />
        <span style={{ fontSize: 16, fontWeight: 600, color: "#1f2937" }}>
          Loading...
        </span>
      </div>
    </div>
  );
}