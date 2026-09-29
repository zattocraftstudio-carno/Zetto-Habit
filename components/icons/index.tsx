import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  ariaLabel?: string;
}

const defaultProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// 1. Navigation & Core Actions
export function HomeIcon({ size = 24, className = '', ariaLabel = 'Home', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
    </svg>
  );
}

export function DashboardIcon({ size = 24, className = '', ariaLabel = 'Dashboard', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M3 3v18h18" />
      <path d="M19 9l-5 5-4-4-3 3" />
      <path d="M14 9h5v5" />
    </svg>
  );
}

export function PlusIcon({ size = 24, className = '', ariaLabel = 'Add', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CalendarIcon({ size = 24, className = '', ariaLabel = 'Calendar', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function SettingsIcon({ size = 24, className = '', ariaLabel = 'Settings', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function CheckIcon({ size = 24, className = '', ariaLabel = 'Completed', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function FlameIcon({ size = 24, className = '', ariaLabel = 'Streak', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M8.5 14.5A4.5 4.5 0 0 0 13 19c3 0 5-2.5 5-5.5 0-3.8-3.4-6.8-4.5-9.5-.7 1.5-1.5 2.8-2.5 3.8-1 1-2.5 2.2-2.5 4.2z" />
      <path d="M12 18a2 2 0 0 0 2-2c0-1.5-1.5-2.5-2-3.5-.5 1-2 2-2 3.5a2 2 0 0 0 2 2z" />
    </svg>
  );
}

export function PencilIcon({ size = 24, className = '', ariaLabel = 'Edit', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export function TrashIcon({ size = 24, className = '', ariaLabel = 'Delete', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function CloseIcon({ size = 24, className = '', ariaLabel = 'Close', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 24, className = '', ariaLabel = 'Previous', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 24, className = '', ariaLabel = 'Next', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DownloadIcon({ size = 24, className = '', ariaLabel = 'Download', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function MoonIcon({ size = 24, className = '', ariaLabel = 'Dark Mode', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function SunIcon({ size = 24, className = '', ariaLabel = 'Light Mode', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function LogoutIcon({ size = 24, className = '', ariaLabel = 'Log Out', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function BotIcon({ size = 24, className = '', ariaLabel = 'AI Assistant', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16.01" />
      <line x1="16" y1="16" x2="16" y2="16.01" />
    </svg>
  );
}

// 2. Curated Habit Icons (24 icons)
export const HABIT_ICONS_LIST = [
  { key: 'water', label: 'Water', path: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /> },
  { key: 'book', label: 'Reading', path: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></> },
  { key: 'dumbbell', label: 'Workout', path: <><path d="M6 5v14" /><path d="M18 5v14" /><path d="M2 9v6" /><path d="M22 9v6" /><path d="M6 12h12" /></> },
  { key: 'moon', label: 'Sleep', path: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /> },
  { key: 'code', label: 'Coding', path: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></> },
  { key: 'pen', label: 'Journal', path: <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-1.5M2 22l5-1.5L18 9.5 14.5 6 3.5 17 2 22z" /> },
  { key: 'heart', label: 'Health', path: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /> },
  { key: 'meditation', label: 'Meditation', path: <><circle cx="12" cy="7" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M3 14l3-2 3 2" /><path d="M21 14l-3-2-3 2" /></> },
  { key: 'running', label: 'Running', path: <><circle cx="13" cy="4" r="2" /><path d="M6 21l3-6 3 2 3-5-2-4 3-1" /><path d="M8 12l-4 4" /></> },
  { key: 'walk', label: 'Walking', path: <><circle cx="12" cy="5" r="2" /><path d="M10 22l2-7 3 3v4" /><path d="M8 13l4-3 3 2 3 4" /></> },
  { key: 'plant', label: 'Nature', path: <><path d="M12 2v20" /><path d="M12 7c-4 0-6-3-6-3s0 5 6 6" /><path d="M12 12c4 0 6-3 6-3s0 5-6 6" /></> },
  { key: 'coffee', label: 'Coffee', path: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></> },
  { key: 'sun', label: 'Morning', path: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.93 19.07l1.41-1.41" /><path d="M17.66 6.34l1.41-1.41" /></> },
  { key: 'clock', label: 'Time', path: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
  { key: 'smile', label: 'Mood', path: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></> },
  { key: 'target', label: 'Focus', path: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></> },
  { key: 'apple', label: 'Diet', path: <><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z" /><path d="M10 2c1 .5 2 2 2 4" /></> },
  { key: 'music', label: 'Music', path: <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> },
  { key: 'shield', label: 'Habit Break', path: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /> },
  { key: 'star', label: 'Goal', path: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /> },
];

export function HabitIcon({
  iconKey,
  size = 20,
  className = '',
  ariaLabel,
}: {
  iconKey?: string | null;
  size?: number | string;
  className?: string;
  ariaLabel?: string;
}) {
  const icon = HABIT_ICONS_LIST.find((i) => i.key === iconKey) || HABIT_ICONS_LIST[0];
  return (
    <svg
      width={size}
      height={size}
      {...defaultProps}
      className={className}
      aria-label={ariaLabel || icon.label}
      role="img"
    >
      {icon.path}
    </svg>
  );
}

/** Message bubble — used by the feedback section and support affordances. */
export function ChatIcon({ size = 24, className = '', ariaLabel = 'Feedback', ...props }: IconProps) {
  return (
    <svg width={size} height={size} {...defaultProps} className={className} aria-label={ariaLabel} role="img" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

/**
 * WhatsApp glyph, filled (the official mark is a solid mark, not a stroke icon).
 * Kept local so no third-party asset or icon package is required.
 */
export function WhatsAppIcon({ size = 24, className = '', ariaLabel = 'WhatsApp', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label={ariaLabel}
      role="img"
      {...props}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
