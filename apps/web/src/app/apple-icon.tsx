import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#ffffff",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="124"
        height="124"
        viewBox="0 0 24 24"
        fill="#dc2626"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 21s-7.5-4.5-10-9.5C.5 7 3 3 7 3c2 0 3.5 1 5 3 1.5-2 3-3 5-3 4 0 6.5 4 5 8.5-2.5 5-10 9.5-10 9.5z" />
      </svg>
    </div>,
    { ...size }
  );
}
