import { ImageResponse } from "next/og";

// Generates a 180x180 PNG of the Knovo mark for iOS home screens — and a
// convenient downloadable PNG (served at /apple-icon) to upload as the logo in
// the Google OAuth Branding screen. No native rasterizer needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="180" height="180">
  <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#312E81"/><stop offset="1" stop-color="#0B1120"/></linearGradient></defs>
  <rect width="32" height="32" rx="8" fill="url(#g)"/>
  <g stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="1.8" stroke-linecap="round">
    <line x1="11" y1="8" x2="11" y2="24"/><line x1="11" y1="16" x2="22" y2="8"/><line x1="11" y1="16" x2="22" y2="24"/></g>
  <g>
    <circle cx="11" cy="8" r="3" fill="#FFFFFF"/><circle cx="11" cy="8" r="2" fill="#FBBF24"/>
    <circle cx="11" cy="16" r="3" fill="#FFFFFF"/><circle cx="11" cy="16" r="2" fill="#A855F7"/>
    <circle cx="11" cy="24" r="3" fill="#FFFFFF"/><circle cx="11" cy="24" r="2" fill="#34D399"/>
    <circle cx="22" cy="8" r="3" fill="#FFFFFF"/><circle cx="22" cy="8" r="2" fill="#38BDF8"/>
    <circle cx="22" cy="24" r="3" fill="#FFFFFF"/><circle cx="22" cy="24" r="2" fill="#FB7185"/></g>
</svg>`;

export default function AppleIcon() {
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={180} height={180} alt="Knovo" />
      </div>
    ),
    size,
  );
}
