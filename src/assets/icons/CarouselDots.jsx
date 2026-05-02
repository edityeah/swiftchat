/**
 * CarouselDots — extracted from Figma node 4395:5305 (Frame 1410083521).
 * Three dots: outer two are muted (#C3D2FC), active centre is #386AF6.
 */
export default function CarouselDots({ active = 1 }) {
  const dots = [
    active === 0 ? '#386AF6' : '#C3D2FC',
    active === 1 ? '#386AF6' : '#C3D2FC',
    active === 2 ? '#386AF6' : '#C3D2FC',
  ]
  return (
    <svg width="30" height="6" viewBox="0 0 30 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="3"  cy="3" r="3" fill={dots[0]} />
      <circle cx="15" cy="3" r="3" fill={dots[1]} />
      <circle cx="27" cy="3" r="3" fill={dots[2]} />
    </svg>
  )
}
