'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import DesktopUserMenu from '@/components/DesktopUserMenu';
import { isLocale, type AppLocale } from '@/i18n/locales';
import { localizePath } from '@/i18n/pathnames';
import { useInvestApp } from '@/lib/investapp-context';
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';

type DesktopTopbarProps = {
  actions?: ReactNode;
  avatarUrl?: string | null;
  displayName: string;
  loading?: boolean;
  notificationHref?: string;
  notificationOnClick?: () => void;
  notificationsEnabled?: boolean;
  onSearchChange?: (value: string) => void;
  onSearchFocus?: () => void;
  publishDisabled?: boolean;
  publishHref?: string;
  publishLabel?: string;
  roleLabel: string;
  searchOverlay?: ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  unreadNotificationsCount?: number;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.7 16.7A7.5 7.5 0 1 0 5.3 5.3a7.5 7.5 0 0 0 11.4 11.4Z" />
      <path d="M16.7 16.7 21 21" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 4a5 5 0 0 0-5 5v2.8c0 .9-.3 1.7-.9 2.4L5 15.5h14l-1.1-1.3a3.8 3.8 0 0 1-.9-2.4V9a5 5 0 0 0-5-5Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function InvestIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 17 10 12l4 4 5-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#6B39F4]" />;

  return (
    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6B39F4] px-1 text-[10px] font-semibold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function DesktopTopbar({
  actions,
  avatarUrl,
  displayName,
  loading = false,
  notificationHref = '/notifications',
  notificationOnClick,
  notificationsEnabled = true,
  onSearchChange,
  onSearchFocus,
  publishDisabled,
  publishHref = '/publish',
  publishLabel,
  roleLabel,
  searchOverlay,
  searchPlaceholder,
  searchValue,
  unreadNotificationsCount = 0,
}: DesktopTopbarProps) {
  const t = useTranslations('Topbar');
  const locale = useLocale();
  const { getAccessToken, user } = usePrivy();
  const { rolSeleccionado } = useInvestApp();
  const activeLocale: AppLocale = isLocale(locale) ? locale : 'en';
  const isEntrepreneur = rolSeleccionado === 'emprendedor';
  const shouldResolvePublishState = isEntrepreneur && publishDisabled === undefined;
  const [hasCurrentProject, setHasCurrentProject] = useState(false);
  const [loadingProjectState, setLoadingProjectState] = useState(false);

  useEffect(() => {
    if (!shouldResolvePublishState) return;

    let cancelled = false;

    const loadProjectState = async () => {
      if (!user?.id) {
        setHasCurrentProject(false);
        setLoadingProjectState(false);
        return;
      }

      setLoadingProjectState(true);
      const { data, error } = await fetchCurrentUserProjects(getAccessToken, { limit: 1 });
      if (cancelled) return;
      setHasCurrentProject(error ? true : Boolean(data?.length));
      setLoadingProjectState(false);
    };

    void loadProjectState();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, shouldResolvePublishState, user?.id]);

  const effectivePublishDisabled = isEntrepreneur
    ? publishDisabled ?? (loadingProjectState || hasCurrentProject || !user?.id)
    : false;
  const primaryCtaLabel = isEntrepreneur ? publishLabel || t('publishProject') : t('investInBusiness');
  const primaryCtaHref = localizePath(isEntrepreneur ? publishHref : '/feed', activeLocale);
  const notificationClassName = `relative grid h-10 w-10 place-items-center rounded-xl border shadow-[0_12px_28px_rgba(21,28,44,0.05)] transition duration-200 hover:-translate-y-0.5 ${
    notificationsEnabled
      ? 'border-[#E7EAF3] bg-white text-[#1F2A44] hover:text-[#6B39F4]'
      : 'border-[#F6B7C3] bg-[#FFF1F3] text-[#DF1C41]'
  }`;
  const publishClassName = `inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold text-white shadow-[0_18px_36px_rgba(107,57,244,0.24)] transition duration-200 ${
    effectivePublishDisabled
      ? 'cursor-not-allowed bg-[#C8CBE0] opacity-70'
      : 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B2FF4_100%)] hover:-translate-y-0.5'
  }`;
  const searchProps = searchValue === undefined ? {} : { value: searchValue };

  const notificationContent = (
    <>
      <BellIcon />
      <NotificationBadge count={unreadNotificationsCount} />
    </>
  );

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center gap-4 border-b border-[#E7EAF3] bg-white/86 px-5 backdrop-blur-xl xl:px-6">
      <div className="relative w-full max-w-[540px] flex-1 2xl:max-w-[620px]">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA4B7]">
          <SearchIcon />
        </span>
        <input
          {...searchProps}
          onChange={onSearchChange ? (event) => onSearchChange(event.target.value) : undefined}
          onFocus={onSearchFocus}
          placeholder={searchPlaceholder || t('searchPlaceholder')}
          className="h-10 w-full rounded-xl border border-[#DDE2EE] bg-white pl-12 pr-4 text-sm font-medium text-[#182033] outline-none shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition placeholder:text-[#9BA5B8] focus:border-[#BBA7FF] focus:ring-4 focus:ring-[#6B39F4]/10"
        />
        {searchOverlay}
      </div>

      <div className="ml-auto flex items-center gap-3 pl-10 xl:pl-16 2xl:pl-24">
        {actions}
        {notificationOnClick ? (
          <button
            type="button"
            aria-label={t('notifications')}
            onClick={notificationOnClick}
            className={notificationClassName}
          >
            {notificationContent}
          </button>
        ) : (
          <Link href={localizePath(notificationHref, activeLocale)} aria-label={t('notifications')} className={notificationClassName}>
            {notificationContent}
          </Link>
        )}

        <Link
          href={effectivePublishDisabled ? '#' : primaryCtaHref}
          aria-disabled={effectivePublishDisabled}
          className={publishClassName}
          onClick={(event) => {
            if (effectivePublishDisabled) event.preventDefault();
          }}
        >
          {isEntrepreneur ? <PlusIcon /> : <InvestIcon />}
          {primaryCtaLabel}
        </Link>

        <DesktopUserMenu avatarUrl={avatarUrl} displayName={displayName} loading={loading} roleLabel={roleLabel} />
      </div>
    </header>
  );
}
