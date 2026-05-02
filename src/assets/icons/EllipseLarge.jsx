/**
 * EllipseLarge — extracted from Figma node 4395:5288 (Ellipse 3639).
 * Large soft blue gradient circle used behind the shield illustration.
 */
export default function EllipseLarge({ size = 297 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 296.674 296.674"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        opacity="0.15"
        cx="148.337"
        cy="148.337"
        r="148.337"
        fill="url(#ellipse-large-grad)"
      />
      <defs>
        <linearGradient id="ellipse-large-grad" x1="101.167" y1="93.7192" x2="211.023" y2="285.502" gradientUnits="userSpaceOnUse">
          <stop stopColor="#386AF6" />
          <stop offset="1" stopColor="#386AF6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
