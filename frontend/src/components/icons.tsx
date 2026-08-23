import type { SVGProps } from 'react';

/** Small hand-authored line-icon set — deliberately not a third-party icon library
 * dependency, since we only need ~16 consistent glyphs. Stroke-only, 1.6 weight, round
 * caps/joins throughout so every icon reads as one family. Each is purely decorative
 * next to a text label unless otherwise noted, so aria-hidden by default. */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.5" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.2C4 4 5 3.4 6.2 3.6c2 .3 3.8 1 5.8 2 2-1 3.8-1.7 5.8-2C19 3.4 20 4 20 5.2v13.4c0 1-1 1.6-2 1.4-2-.3-3.8-1-6-2-2.2 1-4 1.7-6 2-1 .2-2-.4-2-1.4z" />
      <path d="M12 5.6v14" />
    </svg>
  );
}

export function IconAward(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M8.5 13.5 7 21l5-2.6L17 21l-1.5-7.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c.7-3.4 3-5.2 5.5-5.2S13.8 16.6 14.5 20" />
      <circle cx="17" cy="8.5" r="2.4" />
      <path d="M15.5 14.5c2.1.2 3.7 1.7 4.4 5" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3.5" width="10" height="17" rx="1" />
      <path d="M14 9.5h5.5a.6.6 0 0 1 .6.6V20a.6.6 0 0 1-.6.6H14" />
      <path d="M7.2 7.3h.02M10.8 7.3h.02M7.2 10.6h.02M10.8 10.6h.02M7.2 13.9h.02M10.8 13.9h.02M17.1 13.2h.02M17.1 16.4h.02" />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="1.5" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M8.5 11.5h7M8.5 15h7M8.5 18h4" />
    </svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.4 19 6v6c0 4.5-2.9 7.7-7 8.6C7.9 19.7 5 16.5 5 12V6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4.5 1.3 5.7 1.3 5.7H4.7S6 15 6 10.5Z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

export function IconSun(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.4M12 19v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.6 12H5M19 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.2A8.3 8.3 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z" />
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M14.5 8 19 12l-4.5 4M19 12H9" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

export function IconGraduationCap(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9.5 12 5l9 4.5-9 4.5-9-4.5Z" />
      <path d="M7 11.8V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4.2" />
      <path d="M20 9.5v5.2" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.5 12.3 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function IconAlertCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 8v5" />
      <path d="M12 16.2h.01" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12.5h4.5l1.3 2.3h4.4l1.3-2.3H20" />
      <path d="M5.5 5.5h13l1.5 7v5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 17.5v-5z" />
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.6h8l4 4v12.3a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20.4V5.1A1.5 1.5 0 0 1 5.5 3.6z" />
      <path d="M14 3.6v4h4" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4.5" />
      <path d="M8 8.3 12 4.2l4 4.1" />
      <path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

export function IconVideo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="6" width="12" height="12" rx="1.5" />
      <path d="M15.5 10.5 20 8v8l-4.5-2.5" />
    </svg>
  );
}

export function IconMessage(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5h16v10.5a1 1 0 0 1-1 1H9l-4 3.3v-3.3h-1a1 1 0 0 1-1-1z" />
      <path d="M8 9.5h8M8 12.7h5" />
    </svg>
  );
}
