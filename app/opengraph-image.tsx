import { ImageResponse } from 'next/og'

export const alt = 'Travel Calendar — Shared Trip Planner for Couples'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#121110',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          position: 'relative',
          padding: '80px 96px',
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#A8A29A',
            marginBottom: 28,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Travel Calendar
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: '#F5F2EC',
            lineHeight: 1.02,
            maxWidth: 900,
            letterSpacing: '-0.03em',
          }}
        >
          Plan the trip together.
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#A8A29A',
            maxWidth: 760,
            marginTop: 28,
            lineHeight: 1.45,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          One calendar for couples and travel partners — flights, stays, notes, and packing in one place.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 96,
            fontSize: 20,
            color: '#C4B59C',
            letterSpacing: '0.08em',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          travelcalendar.space
        </div>
      </div>
    ),
    { ...size },
  )
}
