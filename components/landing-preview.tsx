/**
 * Signed-out preview. Same plan card, day, and face classes as the trip,
 * with sample copy so the landing shows the product instead of a photo.
 */
export function LandingPreview() {
  return (
    <div className="landing-preview" aria-hidden="true">
      <div className="landing-preview__head">
        <p className="landing-preview__trip">Lisbon with you</p>
        <p className="landing-preview__dates">Nov 18 – 24</p>
      </div>
      <div className="landing-preview__people">
        <span className="traveler-face traveler-face--you">C</span>
        <span className="traveler-face traveler-face--other">A</span>
        <span className="traveler-face traveler-face--other">M</span>
        <span className="landing-preview__who">you + 2</span>
      </div>
      <div>
        <p className="story-chapter__date">Wed · Nov 18</p>
        <p className="story-chapter__place">Lisbon</p>
      </div>
      <div className="plan-card plan-card--flight">
        <span className="plan-card__rail" />
        <span className="min-w-0 flex-1">
          <span className="plan-card__kind">Flight</span>
          <span className="plan-card__title">TAP to Lisbon</span>
          <span className="plan-card__meta">SFO 4:10 PM to LIS 11:40 AM</span>
        </span>
      </div>
      <div className="plan-card plan-card--stay">
        <span className="plan-card__rail" />
        <span className="min-w-0 flex-1">
          <span className="plan-card__kind">Stay</span>
          <span className="plan-card__title">Alfama apartment</span>
          <span className="plan-card__meta">Check-in after the flight</span>
        </span>
      </div>
      <div>
        <p className="story-chapter__date">Thu · Nov 19</p>
        <p className="story-chapter__place">Lisbon</p>
      </div>
      <div className="plan-card plan-card--place">
        <span className="plan-card__rail" />
        <span className="min-w-0 flex-1">
          <span className="plan-card__kind">Place</span>
          <span className="plan-card__title">Time Out Market</span>
          <span className="plan-card__meta">Lunch</span>
        </span>
      </div>
    </div>
  )
}
