/**
 * EllipseSmall — extracted from Figma node 4395:5295 (Ellipse 3640).
 * Small soft blue gradient circle, bottom-right accent in the hero.
 */
export default function EllipseSmall({ size = 101 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100.563 100.563"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        opacity="0.1"
        cx="50.2813"
        cy="50.2813"
        r="50.2813"
        fill="url(#ellipse-small-grad)"
      />
      <defs>
        <linearGradient id="ellipse-small-grad" x1="34.2923" y1="31.7677" x2="71.53" y2="96.7758" gradientUnits="userSpaceOnUse">
          <stop stopColor="#386AF6" />
          <stop offset="1" stopColor="#386AF6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
