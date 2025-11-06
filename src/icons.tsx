// inline icons using SVG; no preact h import needed

type IconProps = { size?: number; color?: string; class?: string }

export const IconCopy = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <rect x="2" y="2" width="13" height="13" rx="2"/>
  </svg>
)

export const IconEye = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconEyeOff = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <path d="M1 12s4-8 11-8a10.62 10.62 0 0 1 5 1" />
    <path d="M23 12s-4 8-11 8a10.62 10.62 0 0 1-5-1" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
)

export const IconUpload = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5-5 5 5" />
    <path d="M12 15V5" />
  </svg>
)

export const IconTrash = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
)

export const IconPalette = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <path d="M12 22a10 10 0 1 1 10-10c0 3-2 3-4 3h-1c-2 0-3 1-3 3 0 2 1 4-2 4z" />
    <circle cx="6.5" cy="12" r="1.5" />
    <circle cx="9.5" cy="7.5" r="1.5" />
    <circle cx="14.5" cy="7.5" r="1.5" />
    <circle cx="17.5" cy="12" r="1.5" />
  </svg>
)

export const IconPreview = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <rect x="3" y="3" width="18" height="14" rx="2" />
    <path d="M8 21h8" />
  </svg>
)

export const IconStructure = ({ size = 16, color = 'currentColor', class: cls }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" class={cls}>
    <path d="M6 3h12v4H6z" />
    <path d="M3 11h6v4H3z" />
    <path d="M15 11h6v4h-6z" />
  </svg>
)
