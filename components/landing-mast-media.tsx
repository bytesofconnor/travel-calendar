"use client"

import { useEffect, useState } from "react"

export function LandingMastMedia() {
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <div className="create-join__media" aria-hidden="true">
      {reduceMotion ? null : (
        <video
          className="create-join__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/landing-poster.jpg"
        >
          <source src="/landing-travel.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  )
}
