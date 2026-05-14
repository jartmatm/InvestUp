'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { DesktopSidebarIcon } from '@/components/DesktopSidebarIcon';
import DesktopUpgradeCard from '@/components/DesktopUpgradeCard';
import { isLocale, type AppLocale } from '@/i18n/locales';
import { localizePath, stripLocalePrefix } from '@/i18n/pathnames';

type DesktopSidebarProps = {
  activeHref?: string;
  roleLabel: string;
};

const primaryItems = [
  { href: '/home', labelKey: 'home', icon: 'home' },
  { href: '/portfolio', labelKey: 'portfolio', icon: 'portfolio' },
  { href: '/invest', labelKey: 'send', icon: 'transfer' },
  { href: '/feed', labelKey: 'feed', icon: 'feed' },
  { href: '/profile', labelKey: 'profile', icon: 'profile' },
] as const;

const secondaryItems = [
  { href: '/home?topup=1', labelKey: 'topUp', icon: 'topup' },
  { href: '/withdraw', labelKey: 'withdraw', icon: 'withdraw' },
  { href: '/contracts', labelKey: 'documents', icon: 'documents' },
] as const;

export function getDesktopSidebarActiveHref(pathname: string) {
  if (pathname.startsWith('/profile')) return '/profile';
  if (pathname.startsWith('/portfolio') || pathname.startsWith('/contracts')) return '/portfolio';
  if (pathname.startsWith('/feed') || pathname.startsWith('/publish')) return '/feed';
  if (pathname.startsWith('/invest') || pathname.startsWith('/withdraw') || pathname.startsWith('/history')) {
    return '/invest';
  }
  return '/home';
}

function InvestAppLogo() {
  return (
    <div className="flex w-full items-center justify-center gap-0.5 text-[2.02rem] font-semibold tracking-[-0.07em] text-[#111827]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-3 w-3 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

export default function DesktopSidebar({ activeHref, roleLabel }: DesktopSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('Navigation');
  const activePathname = stripLocalePrefix(pathname);
  const activeLocale: AppLocale = isLocale(locale) ? locale : 'en';
  const resolvedActiveHref = activeHref ?? getDesktopSidebarActiveHref(activePathname);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-[#E7EAF3] bg-white/94 px-5 py-6 shadow-[12px_0_50px_rgba(21,28,44,0.04)] backdrop-blur-xl">
      <InvestAppLogo />

      <nav className="mt-9 space-y-1.5">
        {primaryItems.map((item) => {
          const active = item.href === resolvedActiveHref;
          return (
            <Link
              key={item.labelKey}
              href={localizePath(item.href, activeLocale)}
              className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition duration-200 ${
                active
                  ? 'bg-[#F2EDFF] text-[#6B39F4] shadow-[0_12px_28px_rgba(107,57,244,0.10)]'
                  : 'text-[#64708A] hover:bg-[#F7F8FB] hover:text-[#1F2A44]'
              }`}
            >
              <DesktopSidebarIcon type={item.icon} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-7 border-t border-[#EEF1F7] pt-6">
        <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#98A1B5]">
          {roleLabel}
        </p>
        <div className="mt-3 space-y-1.5">
          {secondaryItems.map((item) => (
            <Link
              key={item.labelKey}
              href={localizePath(item.href, activeLocale)}
              className="flex h-10 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-[#64708A] transition duration-200 hover:bg-[#F7F8FB] hover:text-[#1F2A44]"
            >
              <DesktopSidebarIcon type={item.icon} />
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <DesktopUpgradeCard />
    </aside>
  );
}
