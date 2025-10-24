import type { SVGProps } from "react";

const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width={32}
    height={32}
    {...props}
  >
    <path
      fill="hsl(var(--primary))"
      d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm-8.49 148.49a48 48 0 1 1 0-69l37 37a12 12 0 1 1-17 17l-37-37a24 24 0 1 0 0 34l37-37a12 12 0 1 1 17 17Z"
    />
  </svg>
);
export default Logo;
