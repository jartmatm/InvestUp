type DesktopSidebarIconProps = {
  type: string;
  className?: string;
};

export function DesktopSidebarIcon({ type, className = 'h-5 w-5' }: DesktopSidebarIconProps) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 10.5 12 4l8 6.5V20H5.5A1.5 1.5 0 0 1 4 18.5v-8Z" />
        <path d="M9 20v-6h6v6" />
      </svg>
    );
  }

  if (type === 'portfolio' || type === 'investments' || type === 'returns' || type === 'analytics') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 17 9 12l4 4 7-8" />
        <path d="M14 8h6v6" />
      </svg>
    );
  }

  if (type === 'send' || type === 'wallet' || type === 'transfer') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M21 12v-2M13 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3" />
        <path d="M16 17h5m0 0-2-2m2 2-2 2" />
      </svg>
    );
  }

  if (type === 'feed') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="5" y="4" width="14" height="16" rx="3" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    );
  }

  if (type === 'profile') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === 'topup') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (type === 'withdraw') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 5v14" />
        <path d="m6 13 6 6 6-6" />
        <path d="M5 5h14" />
      </svg>
    );
  }

  if (type === 'documents') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M7 3h7l4 4v14H7V3Z" />
        <path d="M14 3v5h5M9 13h6M9 17h6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M4 17 9 12l4 4 7-8" />
      <path d="M14 8h6v6" />
    </svg>
  );
}
