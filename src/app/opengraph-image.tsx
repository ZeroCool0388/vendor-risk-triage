import { ImageResponse } from "next/og";
export const alt = "VendorRisk Triage — Evidence first. Decisions faster.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#f6f8fa",
        display: "flex",
        flexDirection: "column",
        padding: 70,
        fontFamily: "sans-serif",
        color: "#172536",
      }}
    >
      <div
        style={{
          display: "flex",
          color: "#087e72",
          fontSize: 30,
          fontWeight: 700,
        }}
      >
        VendorRisk / Triage
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 700,
          marginTop: 80,
          letterSpacing: -2,
        }}
      >
        Evidence first.
        <br />
        Decisions faster.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 25,
          marginTop: 28,
          color: "#5c6c7f",
        }}
      >
        Cited vendor risk assessments. Analyst control. Practical next steps.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          marginTop: 60,
          color: "#087e72",
        }}
      >
        A synthetic portfolio demo by Steve Grady
      </div>
    </div>,
    size,
  );
}
