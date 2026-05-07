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
      <svg viewBox="0 0 24 24" className={className} fill="none">
        <path
          d="M6 9.8835H4.5C3.67157 9.8835 3 9.20482 3 8.36762V8.16524C3 7.36649 3.46547 6.64266 4.18772 6.31826L11.1877 3.1742C11.7049 2.94193 12.2951 2.94193 12.8123 3.1742L19.8123 6.31826C20.5345 6.64266 21 7.36649 21 8.16524V8.36762C21 9.20482 20.3284 9.8835 19.5 9.8835H18M6 9.8835V16.9576M6 9.8835H10M6 16.9576H4.5C3.67157 16.9576 3 17.6363 3 18.4735V19.4841C3 20.3213 3.67157 21 4.5 21H19.5C20.3284 21 21 20.3213 21 19.4841V18.4735C21 17.6363 20.3284 16.9576 19.5 16.9576H18M6 16.9576H10M18 9.8835V16.9576M18 9.8835H14M18 16.9576H14M14 9.8835V16.9576M14 9.8835H10M14 16.9576H10M10 9.8835V16.9576"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'withdraw') {
    return (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 6V14M12 14L14.5 11.5M12 14L9.5 11.5M15.5 8H17C18.6569 8 20 9.34315 20 11V15C20 16.6569 18.6569 18 17 18H7C5.34315 18 4 16.6569 4 15V11C4 9.34315 5.34315 8 7 8H8.5" />
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
