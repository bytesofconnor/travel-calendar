import { ImageResponse } from 'next/og'

export const alt = 'Travel Calendar — Shared Trip Planner for Couples'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,255,255,0.06), transparent)',
          }}
        />

        <div
          style={{
            width: 80,
            height: 80,
            background: 'linear-gradient(180deg, #1f2937, #111827)',
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            border: '4px solid rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              background: '#60a5fa',
              borderRadius: 999,
              boxShadow: '0 0 0 10px rgba(96,165,250,0.16)',
            }}
          />
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: 16,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: 20,
          }}
        >
          Travel Calendar
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: 900,
            marginBottom: 24,
          }}
        >
          Plan trips together.
        </div>

        {/* Subline */}
        <div
          style={{
            fontSize: 28,
            color: '#888',
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          One calendar. Two people. Every adventure.
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontSize: 20,
            color: '#444',
            letterSpacing: '0.05em',
          }}
        >
          travelcalendar.space
        </div>
      </div>
    ),
    { ...size },
  )
}
