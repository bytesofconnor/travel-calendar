import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#121110",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 92,
            height: 118,
            alignItems: "center",
            justifyContent: "flex-start",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 92,
              height: 92,
              borderRadius: 46,
              background: "#F5F2EC",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "#121110",
              }}
            />
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              background: "#F5F2EC",
              transform: "translateY(-18px) rotate(45deg)",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  )
}
