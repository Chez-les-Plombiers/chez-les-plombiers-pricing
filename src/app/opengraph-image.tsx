import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Chez Les Plombiers — Tarifs Location";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1A1A1A",
          padding: "60px",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <div
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#C8A96E",
              letterSpacing: "16px",
              fontFamily: "monospace",
            }}
          >
            CHEZ LES
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "8px",
              fontFamily: "monospace",
            }}
          >
            PLOMBIERS
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            width: "120px",
            height: "2px",
            backgroundColor: "#C8A96E",
            marginTop: "40px",
            marginBottom: "40px",
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: "24px",
            color: "#999999",
            fontFamily: "monospace",
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Tarifs &amp; Disponibilités
        </div>

        {/* Address */}
        <div
          style={{
            fontSize: "16px",
            color: "#666666",
            fontFamily: "monospace",
            marginTop: "20px",
            letterSpacing: "2px",
          }}
        >
          39 rue des Bourdonnais — Paris 1er
        </div>
      </div>
    ),
    { ...size }
  );
}
