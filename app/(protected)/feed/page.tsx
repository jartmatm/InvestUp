'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import DesktopSidebar from '@/components/DesktopSidebar';
import DesktopTopbar from '@/components/DesktopTopbar';
import { AspectRatio } from '@/components/tailgrids/core/aspect-ratio';
import { Avatar } from '@/components/tailgrids/core/avatar';
import { Button } from '@/components/tailgrids/core/button';
import { Card, CardContent } from '@/components/tailgrids/core/card';
import { useInvestApp } from '@/lib/investapp-context';
import { isProjectPubliclyVisible } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
import { useUserProfileSummary } from '@/lib/use-user-profile-summary';
import { readWishlist, writeWishlist } from '@/lib/wishlist-storage';
import { fetchCurrentUserProjects } from '@/utils/client/current-user-projects';
import { fetchProjects } from '@/utils/client/projects';
import {
  fetchRecipientDirectory,
  type RecipientDirectoryEntry,
} from '@/utils/client/recipient-directory';

type FeedProject = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  owner_user_id: string | null;
  owner_id?: string | null;
  status: string | null;
  amount_requested: number | null;
  minimum_investment: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
};

type SortKey = 'latest' | 'rate' | 'progress' | 'goal';

function IconSearch() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.6569 16.6569C19.781 13.5327 19.781 8.46734 16.6569 5.34315C13.5327 2.21895 8.46734 2.21895 5.34315 5.34315C2.21895 8.46734 2.21895 13.5327 5.34315 16.6569C8.46734 19.781 13.5327 19.781 16.6569 16.6569ZM16.6569 16.6569L21 21" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function IconSort() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 6h10" />
      <path d="M7 12h7" />
      <path d="M7 18h4" />
      <path d="M17 16l2 2 2-2" />
      <path d="M19 18V8" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconHeart({ filled }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 21s-6.7-4.3-9.2-7.6C1 11.5 1.2 8.4 3.4 6.7c2-1.6 4.9-1.2 6.6.8l2 2.3 2-2.3c1.7-2 4.6-2.4 6.6-.8 2.2 1.7 2.4 4.8.6 6.7C18.7 16.7 12 21 12 21z" />
    </svg>
  );
}

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.8 4.8L19 9.6l-4.4 2.6L13 17l-1-4.8L7 9.6l5.2-1.8L12 3Z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3 w-3"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M4 18h16l1-11-5.2 4.2L12 4 8.2 11.2 3 7l1 11Z" />
      <path d="M4.5 21h15" strokeLinecap="round" />
    </svg>
  );
}

function InvestAppWordmark() {
  return (
    <div className="flex items-center gap-0.5 text-[1.55rem] font-semibold tracking-[-0.07em] text-[#1C2336]">
      <span>Invest</span>
      <span className="text-[#6B39F4]">App</span>
      <span className="ml-0.5 mt-0.5 h-2.5 w-2.5 rounded-full bg-[#6B39F4]" />
    </div>
  );
}

function formatAmount(amount: number | null, currency: string | null, locale: string, fallback: string) {
  if (amount === null || amount === undefined) return fallback;
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

const calculateProgress = (raised: number | null, requested: number | null) => {
  if (!requested || requested <= 0) return 0;
  const progress = ((raised ?? 0) / requested) * 100;
  return Math.max(0, Math.min(100, progress));
};

const normalizePhotos = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const toCssImageUrl = (value: string | null | undefined) => (value ? `url(${JSON.stringify(value)})` : '');

const getProjectCoverImage = (project: FeedProject) => project.photo_urls?.[0] ?? null;

const getOwnerAvatarImage = (
  project: FeedProject,
  ownerProfiles: Record<string, RecipientDirectoryEntry>
) => {
  const owner = project.owner_user_id ? ownerProfiles[project.owner_user_id] : null;
  return owner?.avatar_url ?? null;
};

const getOwnerDisplayName = (
  project: FeedProject,
  ownerProfiles: Record<string, RecipientDirectoryEntry>
) => {
  const owner = project.owner_user_id ? ownerProfiles[project.owner_user_id] : null;
  return [owner?.name, owner?.surname].filter(Boolean).join(' ') || owner?.email || 'InvestApp';
};

const getFeaturedSubtitle = (project: FeedProject, fallback: string) => {
  const sector = toEnglishSector(project.sector);
  if (project.city && sector) return `${sector} in ${project.city}`;
  if (project.city) return project.city;
  if (sector) return sector;
  return fallback;
};

const SURFACE_CLASSNAME =
  'rounded-[30px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,255,0.94)_100%)] shadow-[0_24px_70px_rgba(20,28,55,0.08)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl';

const SORT_OPTIONS: Array<{ id: SortKey }> = [
  { id: 'latest' },
  { id: 'rate' },
  { id: 'progress' },
  { id: 'goal' },
];

const CATEGORY_PREFERRED_ORDER = ['Tech', 'Commerce', 'Food', 'Health'];

function FeaturedReelsCarousel({
  loading,
  ownerProfiles,
  projects,
  onOpenProject,
}: {
  loading: boolean;
  ownerProfiles: Record<string, RecipientDirectoryEntry>;
  projects: FeedProject[];
  onOpenProject: (projectId: string) => void;
}) {
  const t = useTranslations('Feed');

  if (loading) {
    return (
      <div className="-mx-1 mb-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`featured-reel-loading-${index}`}
            className="h-[170px] w-[100px] shrink-0 snap-start animate-pulse rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,#F7F8FC_0%,#ECEFFC_100%)] shadow-[0_14px_28px_rgba(20,28,55,0.07)] ring-1 ring-[#EEF1F8]"
          />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="-mx-1 mb-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {projects.map((project) => {
        const coverImage = getProjectCoverImage(project);
        const avatarImage = getOwnerAvatarImage(project, ownerProfiles);
        const ownerName = getOwnerDisplayName(project, ownerProfiles);
        const cardBackground = coverImage
          ? `linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(19,27,48,0.18)_38%,rgba(12,17,31,0.76)_100%),${toCssImageUrl(coverImage)}`
          : 'linear-gradient(145deg,#F7F8FC_0%,#ECE7FF_44%,#7C5CFF_100%)';

        return (
          <button
            key={`featured-reel-${project.id}`}
            type="button"
            onClick={() => onOpenProject(project.id)}
            className="group relative h-[170px] w-[100px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/75 bg-cover bg-center text-left shadow-[0_16px_32px_rgba(20,28,55,0.14)] ring-1 ring-[#E9ECF7]/90 transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[1.03] focus-visible:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A63FF]/55"
            style={{ backgroundImage: cardBackground }}
            aria-label={t('openFeaturedVenture', { title: project.title })}
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.24),transparent_42%)] opacity-90" />

            <Avatar
              src={avatarImage ?? undefined}
              alt={ownerName}
              fallback={getInitials(ownerName)}
              className="absolute left-3 top-3 h-9 w-9 rounded-full border-2 border-white bg-[#F7F8FC] text-[0.68rem] font-bold text-[#6B39F4] shadow-[0_10px_22px_rgba(20,28,55,0.14)] ring-1 ring-[#EEF1F8]"
            />

            <span className="absolute inset-x-3 bottom-3">
              <span className="line-clamp-3 text-[0.88rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.36)]">
                {project.title}
              </span>
              <span className="mt-1 line-clamp-1 block text-[0.62rem] font-medium text-white/86 drop-shadow-[0_2px_8px_rgba(0,0,0,0.30)]">
                {getFeaturedSubtitle(project, t('publishedVenture'))}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#8A63FF_0%,#6B39F4_100%)] px-2.5 py-1 text-[0.58rem] font-bold text-white shadow-[0_10px_18px_rgba(107,57,244,0.26)] ring-1 ring-white/20">
                <IconCrown />
                {t('featuredBadge')}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const DESKTOP_CATEGORY_OPTIONS = [
  'All',
  'Technology',
  'Commerce',
  'Food',
  'Health',
  'Real Estate',
  'Education',
  'Sustainability',
  'Entertainment',
];

const getRateLabel = (project: FeedProject, fallback: string) =>
  project.interest_rate ? `${project.interest_rate}% EA` : fallback;

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
};

function DesktopCategoryIcon({ active, category }: { active: boolean; category: string }) {
  const key = category.toLowerCase().replace(/[^a-z]/g, '');
  const common = {
    className: 'h-4 w-4',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const iconColor = active ? 'text-[#6B39F4]' : 'text-[#5D667A]';

  const icon =
    key === 'all' ? (
      <IconSpark />
    ) : key === 'technology' || key === 'tech' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M4 9h3M4 15h3M17 9h3M17 15h3M9 4v3M15 4v3M9 17v3M15 17v3" />
        <path d="M10 12h4" />
      </svg>
    ) : key === 'commerce' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
        <path d="M9 13h6" />
      </svg>
    ) : key === 'food' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M7 3v8M4.5 3v8M9.5 3v8M4.5 11h5" />
        <path d="M7 11v10" />
        <path d="M16 3c2 1.4 3 3.3 3 5.6V21" />
        <path d="M16 3v10h3" />
      </svg>
    ) : key === 'health' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 20s-7-4.4-8.5-8.3C2.4 8.7 4.2 6 7 6c1.6 0 3 .8 4 2 1-1.2 2.4-2 4-2 2.8 0 4.6 2.7 3.5 5.7C17 15.6 12 20 12 20Z" />
        <path d="M8 12h2l1-2 2 5 1-3h2" />
      </svg>
    ) : key === 'realestate' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-7h6v7" />
        <path d="M8 9h.01M12 9h.01M16 9h.01" />
      </svg>
    ) : key === 'education' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M3 8l9-4 9 4-9 4-9-4Z" />
        <path d="M7 10.2V15c2.8 2 7.2 2 10 0v-4.8" />
        <path d="M20 9v6" />
      </svg>
    ) : key === 'sustainability' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M5 19c8 0 13-5 14-14-9 1-14 6-14 14Z" />
        <path d="M5 19c2.8-4.8 6.2-8 10-10" />
      </svg>
    ) : key === 'entertainment' ? (
      <svg viewBox="0 0 24 24" {...common}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 5v14M16 5v14M4 9h16M4 15h16" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" {...common}>
        <path d="M12 3l7 5v8l-7 5-7-5V8l7-5Z" />
        <path d="M9 12h6M12 9v6" />
      </svg>
    );

  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-lg border transition ${
        active
          ? 'border-[#D9CCFF] bg-[#F1ECFF] text-[#6B39F4]'
          : 'border-white/70 bg-white/72 text-[#5D667A] shadow-[0_8px_18px_rgba(21,28,44,0.05)]'
      } ${iconColor}`}
    >
      {icon}
    </span>
  );
}

function DesktopCategories({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}) {
  const t = useTranslations('Feed');
  const options = Array.from(new Set([...DESKTOP_CATEGORY_OPTIONS, ...categories])).slice(0, 3);

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((category) => {
        const active = category === selectedCategory;
        return (
          <button
            key={`desktop-category-${category}`}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-[0.78rem] font-bold transition ${
              active
                ? 'bg-white text-[#6B39F4] shadow-[0_14px_32px_rgba(107,57,244,0.12)] ring-1 ring-[#CFC3FF]'
                : 'bg-[#F0F2F7] text-[#3E485E] hover:bg-white hover:shadow-[0_12px_28px_rgba(21,28,44,0.06)]'
            }`}
          >
            <DesktopCategoryIcon active={active} category={category} />
            {category === 'All' ? t('all') : category}
          </button>
        );
      })}
    </div>
  );
}

function DesktopReelsSection({
  ownerProfiles,
  projects,
  onOpenProject,
}: {
  ownerProfiles: Record<string, RecipientDirectoryEntry>;
  projects: FeedProject[];
  onOpenProject: (projectId: string) => void;
}) {
  if (projects.length === 0) return null;

  return (
    <section className="mt-5">
      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((project) => {
          const coverImage = getProjectCoverImage(project);
          const avatarImage = getOwnerAvatarImage(project, ownerProfiles);
          const ownerName = getOwnerDisplayName(project, ownerProfiles);
          const cardBackground = coverImage
            ? `linear-gradient(180deg,rgba(8,12,24,0.06)_0%,rgba(8,12,24,0.24)_46%,rgba(8,12,24,0.78)_100%),${toCssImageUrl(coverImage)}`
            : 'linear-gradient(145deg,#F7F8FC_0%,#ECE7FF_44%,#7C5CFF_100%)';

          return (
            <button
              key={`desktop-reel-${project.id}`}
              type="button"
              onClick={() => onOpenProject(project.id)}
              className="group relative h-[clamp(230px,27vh,306px)] w-[clamp(168px,13.2vw,218px)] shrink-0 snap-start overflow-hidden rounded-[18px] bg-cover bg-center text-left shadow-[0_22px_48px_rgba(17,24,39,0.12)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-1 hover:scale-[1.03] hover:shadow-[0_28px_70px_rgba(17,24,39,0.18)]"
              style={{ backgroundImage: cardBackground }}
            >
              <Avatar
                src={avatarImage ?? undefined}
                alt={ownerName}
                fallback={getInitials(ownerName)}
                className="absolute left-3 top-3 h-10 w-10 rounded-full border-2 border-white bg-[#F8F9FB] text-[0.7rem] font-bold text-[#6B39F4] shadow-[0_12px_26px_rgba(0,0,0,0.16)]"
              />
              <span className="absolute inset-x-4 bottom-4">
                <span className="line-clamp-3 text-[1rem] font-bold leading-tight tracking-[-0.04em] text-white">
                  {project.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DesktopProjectCard({
  isWishlisted,
  onOpenProject,
  onToggleWishlist,
  project,
}: {
  isWishlisted: boolean;
  onOpenProject: (projectId: string) => void;
  onToggleWishlist: (projectId: string) => void;
  project: FeedProject;
}) {
  const t = useTranslations('Feed');
  const coverImage = getProjectCoverImage(project);
  const category = toEnglishSector(project.sector) || t('uncategorized');

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpenProject(project.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenProject(project.id);
        }
      }}
      className="group flex h-[272px] cursor-pointer overflow-hidden rounded-[18px] bg-white shadow-[0_18px_38px_rgba(21,28,44,0.07)] ring-1 ring-[#E9ECF4] transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(21,28,44,0.12)]"
    >
      <div className="relative h-3/4 min-h-0">
        <AspectRatio ratio="video" className="h-full w-full">
          {coverImage ? (
            <img src={coverImage} alt={project.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,#EEF2FF_0%,#F7F3FF_100%)]" />
          )}
        </AspectRatio>

        <Button
          variant="ghost"
          iconOnly
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onToggleWishlist(project.id);
          }}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/40 bg-black/28 text-white shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-md transition ${
            isWishlisted ? 'text-[#FFD1DB]' : ''
          }`}
          aria-label={isWishlisted ? t('removeFavorite') : t('addFavorite')}
        >
          <IconHeart filled={isWishlisted} />
        </Button>
      </div>
      <CardContent className="flex h-1/4 min-h-0 flex-col justify-between border-t border-white/60 bg-white/72 p-3 backdrop-blur-md">
        <h3 className="line-clamp-2 text-[0.96rem] font-bold leading-snug tracking-[-0.035em] text-[#111827]">
          {project.title}
        </h3>
        <p className="line-clamp-1 text-[0.78rem] font-medium text-[#6C7890]">{category}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-[#ECFFF5] px-2.5 py-1 text-[0.72rem] font-bold text-[#12895B]">
            {getRateLabel(project, t('ratePending'))}
          </span>
          <span className="text-[0.72rem] font-semibold text-[#8F98AA]">{t('interestRate')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DesktopMarketplaceLayout({
  avatarUrl,
  categories,
  displayName,
  favoritesOnly,
  filteredProjects,
  loading,
  ownerProfiles,
  profileRole,
  projects,
  publishDisabled,
  searchQuery,
  selectedCategory,
  showSortSelector,
  sortBy,
  status,
  wishlist,
  onOpenFilter,
  onOpenProject,
  onSearchChange,
  onSelectCategory,
  onSelectSort,
  onToggleSort,
  onToggleWishlist,
}: {
  avatarUrl: string;
  categories: string[];
  displayName: string;
  favoritesOnly: boolean;
  filteredProjects: FeedProject[];
  loading: boolean;
  ownerProfiles: Record<string, RecipientDirectoryEntry>;
  profileRole: string;
  projects: FeedProject[];
  publishDisabled: boolean;
  searchQuery: string;
  selectedCategory: string;
  showSortSelector: boolean;
  sortBy: SortKey;
  status: string;
  wishlist: string[];
  onOpenFilter: () => void;
  onOpenProject: (projectId: string) => void;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectSort: (sort: SortKey) => void;
  onToggleSort: () => void;
  onToggleWishlist: (projectId: string) => void;
}) {
  const t = useTranslations('Feed');
  const featuredProjects = projects.slice(0, 8);

  return (
    <div className="investapp-desktop-autofit hidden min-h-screen overflow-x-hidden bg-[#F8F9FB] text-[#111827] lg:flex">
      <DesktopSidebar roleLabel={profileRole} />

      <main className="ml-[260px] flex min-h-screen min-w-0 flex-1 flex-col">
        <DesktopTopbar
          avatarUrl={avatarUrl}
          displayName={displayName}
          roleLabel={profileRole}
          publishDisabled={publishDisabled}
          searchValue={searchQuery}
          onSearchChange={onSearchChange}
        />

        <div className="w-full px-5 py-5 xl:px-7 2xl:px-9">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <DesktopCategories
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={onSelectCategory}
              />
              <div className="relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={onToggleSort}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E6F0] bg-white px-3.5 text-xs font-bold text-[#273247] shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition hover:bg-[#FBFBFE]"
                >
                  <IconSort />
                  {t('sortBy')}
                </button>
                <button
                  type="button"
                  onClick={onOpenFilter}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E2E6F0] bg-white px-3.5 text-xs font-bold text-[#273247] shadow-[0_12px_28px_rgba(21,28,44,0.04)] transition hover:bg-[#FBFBFE]"
                >
                  <IconFilter />
                  {t('filter')}
                  {favoritesOnly ? <span className="h-2 w-2 rounded-full bg-[#6B39F4]" /> : null}
                </button>

                {showSortSelector ? (
                  <div className="absolute right-0 top-[calc(100%+12px)] z-30 w-[220px] rounded-[22px] border border-[#E4E8F1] bg-white p-2 shadow-[0_28px_80px_rgba(17,24,39,0.16)]">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={`desktop-sort-${option.id}`}
                        type="button"
                        onClick={() => onSelectSort(option.id)}
                        className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                          option.id === sortBy
                            ? 'bg-[#F1ECFF] text-[#6B39F4]'
                            : 'text-[#49536A] hover:bg-[#F7F8FB]'
                        }`}
                      >
                        {t(`sortOptions.${option.id}`)}
                        {option.id === sortBy ? <IconSpark /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <DesktopReelsSection
              ownerProfiles={ownerProfiles}
              projects={featuredProjects}
              onOpenProject={onOpenProject}
            />

            {loading ? (
              <div className="mt-2 grid max-h-[calc(100vh-510px)] grid-cols-4 gap-4 overflow-y-auto pr-1">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`desktop-project-loading-${index}`}
                    className="h-[272px] animate-pulse rounded-[18px] bg-white shadow-[0_18px_38px_rgba(21,28,44,0.06)] ring-1 ring-[#E9ECF4]"
                  />
                ))}
              </div>
            ) : null}

            {!loading && status ? (
              <div className="mt-5 rounded-[24px] border border-[#E7EAF3] bg-white p-10 text-center shadow-[0_18px_38px_rgba(21,28,44,0.05)]">
                <p className="text-lg font-bold text-[#111827]">{t('loadErrorTitle')}</p>
                <p className="mt-2 text-sm text-[#65718A]">{status}</p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length > 0 ? (
              <div className="mt-2 grid max-h-[calc(100vh-510px)] grid-cols-4 gap-4 overflow-y-auto pr-1">
                {filteredProjects.map((project) => (
                  <DesktopProjectCard
                    key={`desktop-project-${project.id}`}
                    isWishlisted={wishlist.includes(project.id)}
                    project={project}
                    onOpenProject={onOpenProject}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-[#E7EAF3] bg-white p-10 text-center shadow-[0_18px_38px_rgba(21,28,44,0.05)]">
                <p className="text-lg font-bold text-[#111827]">{t('noMatchesTitle')}</p>
                <p className="mt-2 text-sm text-[#65718A]">{t('noMatchesDescription')}</p>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function FeedPage() {
  const t = useTranslations('Feed');
  const roleT = useTranslations('Roles');
  const locale = useLocale();
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const { avatarUrl, displayName, email } = useUserProfileSummary();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, RecipientDirectoryEntry>>({});
  const [loading, setLoading] = useState(true);
  const [hasOwnProject, setHasOwnProject] = useState(false);
  const [loadingOwnProject, setLoadingOwnProject] = useState(true);
  const [status, setStatus] = useState('');
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [wishlistState, setWishlistState] = useState<{ userId: string | null; ids: string[] }>({
    userId: user?.id ?? null,
    ids: readWishlist(user?.id),
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [draftCategory, setDraftCategory] = useState('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [draftFavoritesOnly, setDraftFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('latest');
  const [showSortSelector, setShowSortSelector] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    if (!mobileSearchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchOpen]);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      setStatus('');
      const { data, error } = await fetchProjects({ limit: 48 });

      if (error) {
        setStatus(error);
        setLoading(false);
        return;
      }

      const normalizedProjects = ((data ?? []) as FeedProject[]).map((project) => ({
        ...project,
        photo_urls: normalizePhotos(project.photo_urls),
      }));
      const visibleProjects = normalizedProjects
        .filter((project) => isProjectPubliclyVisible(project))
        .filter((project) => {
          if (rolSeleccionado !== 'emprendedor' || !user?.id) return true;
          return project.owner_user_id !== user.id && project.owner_id !== user.id;
        });
      setProjects(visibleProjects);
      setLoading(false);
    };

    loadFeed();
  }, [rolSeleccionado, user?.id]);

  useEffect(() => {
    const loadOwnProject = async () => {
      if (rolSeleccionado !== 'emprendedor' || !user?.id) {
        setHasOwnProject(false);
        setLoadingOwnProject(false);
        return;
      }

      setLoadingOwnProject(true);
      const { data, error } = await fetchCurrentUserProjects(getAccessToken, { limit: 1 });
      setHasOwnProject(error ? true : Boolean(data?.length));
      setLoadingOwnProject(false);
    };

    void loadOwnProject();
  }, [getAccessToken, rolSeleccionado, user?.id]);

  useEffect(() => {
    const ownerIds = Array.from(
      new Set(projects.map((project) => project.owner_user_id).filter((id): id is string => Boolean(id)))
    );

    if (!user?.id || ownerIds.length === 0) return;

    let cancelled = false;

    const loadOwnerProfiles = async () => {
      const { data } = await fetchRecipientDirectory(getAccessToken, {
        ids: ownerIds,
        limit: ownerIds.length,
      });

      if (cancelled) return;

      const nextProfiles = ((data ?? []) as RecipientDirectoryEntry[]).reduce<
        Record<string, RecipientDirectoryEntry>
      >((accumulator, owner) => {
        accumulator[owner.id] = owner;
        return accumulator;
      }, {});

      setOwnerProfiles(nextProfiles);
    };

    void loadOwnerProfiles();

    return () => {
      cancelled = true;
    };
  }, [getAccessToken, projects, user?.id]);

  const activeWishlistUserId = user?.id ?? null;
  const wishlist =
    wishlistState.userId === activeWishlistUserId
      ? wishlistState.ids
      : readWishlist(activeWishlistUserId);

  const categories = useMemo(() => {
    const available = Array.from(
      new Set(
        projects.map((project) => {
          const sector = toEnglishSector(project.sector);
          return sector && sector.length > 0 ? sector : 'Uncategorized';
        })
      )
    );

    const prioritized = CATEGORY_PREFERRED_ORDER.filter((category) => available.includes(category));
    const remaining = available
      .filter((category) => !CATEGORY_PREFERRED_ORDER.includes(category))
      .sort((left, right) => left.localeCompare(right, 'en'));

    return ['All', ...prioritized, ...remaining];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    let next = projects.filter((project) => {
      const sector = toEnglishSector(project.sector) || 'Uncategorized';

      if (selectedCategory !== 'All' && sector !== selectedCategory) return false;
      if (favoritesOnly && !wishlist.includes(project.id)) return false;

      if (!normalizedQuery) return true;

      const searchableText = [
        project.title,
        project.description,
        sector,
        project.city ?? '',
        project.country ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });

    if (sortBy === 'rate') {
      next = [...next].sort((left, right) => (right.interest_rate ?? 0) - (left.interest_rate ?? 0));
    }

    if (sortBy === 'progress') {
      next = [...next].sort(
        (left, right) =>
          calculateProgress(right.amount_received, right.amount_requested) -
          calculateProgress(left.amount_received, left.amount_requested)
      );
    }

    if (sortBy === 'goal') {
      next = [...next].sort((left, right) => (right.amount_requested ?? 0) - (left.amount_requested ?? 0));
    }

    return next;
  }, [favoritesOnly, projects, searchQuery, selectedCategory, sortBy, wishlist]);

  const featuredProjects = useMemo(() => projects.slice(0, 8), [projects]);

  const toggleFlip = (id: string) => {
    setFlippedId((previous) => (previous === id ? null : id));
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleFlip(id);
  };

  const toggleWishlist = (id: string) => {
    const current = readWishlist(activeWishlistUserId);
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    writeWishlist(activeWishlistUserId, next);
    setWishlistState({ userId: activeWishlistUserId, ids: next });
  };

  const openFilterSheet = () => {
    setDraftCategory(selectedCategory);
    setDraftFavoritesOnly(favoritesOnly);
    setShowSortSelector(false);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    setSelectedCategory(draftCategory);
    setFavoritesOnly(draftFavoritesOnly);
    setShowFilterSheet(false);
  };

  const clearFilters = () => {
    setDraftCategory('All');
    setDraftFavoritesOnly(false);
    setSelectedCategory('All');
    setFavoritesOnly(false);
    setShowFilterSheet(false);
  };
  const publishDisabled = loadingOwnProject || hasOwnProject || !user?.id;
  const profileDisplayName = displayName || email || 'InvestApp user';
  const profileRoleLabel = rolSeleccionado === 'emprendedor' ? roleT('entrepreneur') : roleT('investor');
  const openProjectDetail = (projectId: string) => router.push(`/feed/${projectId}`);
  const openPublish = () => {
    if (!publishDisabled) router.push('/publish');
  };
  const openMobileSearch = () => {
    setShowFilterSheet(false);
    setShowSortSelector(false);
    setMobileSearchOpen(true);
  };
  const closeOrClearMobileSearch = () => {
    if (searchQuery) {
      setSearchQuery('');
      return;
    }

    setMobileSearchOpen(false);
  };

  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.10),transparent_28%),linear-gradient(180deg,#FAFAFE_0%,#F5F6FC_55%,#F7F8FC_100%)] text-[#162033] lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.12),transparent_52%),radial-gradient(circle_at_top_right,rgba(67,120,255,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-24 h-40 rounded-full bg-[#C8BCFF]/16 blur-3xl" />

      {showSortSelector ? (
        <button
          type="button"
          aria-label={t('closeSort')}
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setShowSortSelector(false)}
        />
      ) : null}

      <div className="relative mx-auto flex h-screen w-full max-w-md flex-col px-4 pb-[116px] pt-4">
        <section className={`${SURFACE_CLASSNAME} relative ${showSortSelector ? 'z-40' : 'z-20'} flex min-h-0 flex-1 flex-col overflow-visible p-3.5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="py-1">
              <InvestAppWordmark />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openMobileSearch}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border shadow-[0_16px_30px_rgba(107,57,244,0.10)] transition [&>svg]:h-5 [&>svg]:w-5 ${
                  mobileSearchOpen || searchQuery
                    ? 'border-[#D9CCFF] bg-[linear-gradient(135deg,#F9F6FF_0%,#EEF4FF_100%)] text-[#6736F3] ring-2 ring-[#6B39F4]/10'
                    : 'border-[#EEF1F8] bg-white text-[#7B879C] hover:scale-[1.03] hover:text-[#6736F3]'
                }`}
                aria-label={t('searchAria')}
                aria-expanded={mobileSearchOpen}
              >
                <IconSearch />
              </button>

              <button
                type="button"
                onClick={openPublish}
                disabled={publishDisabled}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border shadow-[0_16px_30px_rgba(107,57,244,0.10)] transition [&>svg]:h-5 [&>svg]:w-5 ${
                  publishDisabled
                    ? 'cursor-not-allowed border-[#E6E8F2] bg-[#F4F5F8] text-[#A9AEC0] opacity-75'
                    : 'border-[#EEE9FF] bg-[#F7F4FF] text-[#7C5CFF] hover:scale-[1.03]'
                }`}
                aria-label={t('publishAria')}
              >
                <IconPlus />
              </button>
            </div>
          </div>

          {mobileSearchOpen ? (
            <div className="mt-2 flex items-center gap-2 rounded-[15px] border border-[#E6E8F4] bg-[#FAF9FF] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(27,36,53,0.05)]">
              <span className="text-[#9AA3B6] [&>svg]:h-4 [&>svg]:w-4">
                <IconSearch />
              </span>
              <input
                ref={mobileSearchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="h-5 w-full border-none bg-transparent text-[0.75rem] font-medium tracking-[-0.02em] text-[#162033] outline-none placeholder:text-[#A0A8BA]"
                aria-label={t('searchAria')}
              />
              <button
                type="button"
                onClick={closeOrClearMobileSearch}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#7B879C] shadow-[0_8px_18px_rgba(27,36,53,0.06)] transition hover:text-[#6736F3]"
                aria-label={searchQuery ? t('clearSearch') : t('closeSearch')}
              >
                <IconClose />
              </button>
            </div>
          ) : null}

          <div className="relative mt-2">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
              {categories.map((category) => {
                const active = category === selectedCategory;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`shrink-0 rounded-full px-2.5 py-1.5 text-[0.6rem] font-semibold tracking-[-0.01em] transition ${
                      active
                        ? 'border border-[#CFC3FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F4EEFF_100%)] text-[#6B39F4] shadow-[0_10px_22px_rgba(107,57,244,0.12)]'
                        : 'border border-[#EEF1F8] bg-white text-[#596277] shadow-[0_8px_18px_rgba(27,36,53,0.04)]'
                    }`}
                  >
                    {category === 'All' ? t('all') : category}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={openFilterSheet}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9E4FF] bg-white px-2.5 py-1.5 text-[0.6rem] font-semibold text-[#6736F3] shadow-[0_8px_18px_rgba(107,57,244,0.08)] transition hover:scale-[1.01]"
              >
                <IconFilter />
                {t('filter')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowFilterSheet(false);
                  setShowSortSelector((previous) => !previous);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.6rem] font-semibold shadow-[0_8px_18px_rgba(22,32,51,0.06)] transition hover:scale-[1.01] ${
                  showSortSelector
                    ? 'border-[#CFC3FF] bg-[#F7F3FF] text-[#6736F3]'
                    : 'border-[#E8ECF8] bg-white text-[#445067]'
                }`}
              >
                <IconSort />
                {t('sort')}
              </button>
            </div>

            {showSortSelector ? (
              <div className="absolute right-1 top-[calc(100%+8px)] z-40 w-[204px] rounded-[24px] border border-white/85 bg-white/96 p-2 shadow-[0_26px_70px_rgba(17,24,39,0.18)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl">
                {SORT_OPTIONS.map((option) => {
                  const active = option.id === sortBy;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSortBy(option.id);
                        setShowSortSelector(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left text-[0.78rem] font-medium tracking-[-0.02em] transition ${
                        active
                          ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_16px_28px_rgba(107,57,244,0.22)]'
                          : 'text-[#3E475B] hover:bg-[#F7F7FE]'
                      }`}
                    >
                      <span>{t(`sortOptions.${option.id}`)}</span>
                      {active ? <IconSpark /> : <IconChevronDown />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
            <FeaturedReelsCarousel
              loading={loading}
              ownerProfiles={ownerProfiles}
              projects={featuredProjects}
              onOpenProject={openProjectDetail}
            />

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`feed-loading-${index}`}
                    className="h-[232px] animate-pulse rounded-[22px] border border-[#EEF1F7] bg-white p-2.5 shadow-[0_18px_36px_rgba(18,27,48,0.05)]"
                  >
                    <div className="h-[172px] rounded-[16px] bg-[#EAEFFC]" />
                    <div className="mt-2 h-3 rounded-full bg-[#EEF2FC]" />
                    <div className="mt-1.5 h-3 w-4/5 rounded-full bg-[#EEF2FC]" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && status ? (
              <div className="rounded-[22px] border border-[#EEF1F7] bg-white p-4 shadow-[0_18px_36px_rgba(18,27,48,0.05)]">
                <p className="text-sm font-semibold text-[#152033]">{t('loadErrorShort')}</p>
                <p className="mt-1 text-sm leading-6 text-[#70798D]">{status}</p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length === 0 ? (
              <div className="rounded-[22px] border border-[#EEF1F7] bg-white p-5 text-center shadow-[0_18px_36px_rgba(18,27,48,0.05)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(124,92,255,0.14),rgba(67,120,255,0.10))] text-[#6B39F4] shadow-[0_16px_30px_rgba(107,57,244,0.12)]">
                  <IconSearch />
                </div>
                <p className="mt-4 text-[1rem] font-semibold tracking-[-0.03em] text-[#152033]">
                  {t('noMatchesTitle')}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#70798D]">{t('noMatchesDescriptionLong')}</p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredProjects.map((project) => {
                  const isFlipped = flippedId === project.id;
                  const isWishlisted = wishlist.includes(project.id);
                  const amountLabel = formatAmount(project.amount_requested, project.currency, locale, t('noAmount'));
                  const raisedLabel = formatAmount(project.amount_received, project.currency, locale, t('noAmount'));
                  const minimumInvestmentLabel = formatAmount(
                    project.minimum_investment,
                    project.currency,
                    locale,
                    t('noAmount')
                  );
                  const rateLabel = project.interest_rate ? `${project.interest_rate}% EA` : t('ratePending');
                  const categoryLabel = toEnglishSector(project.sector) || t('uncategorized');
                  const coverImage = getProjectCoverImage(project);
                  const isOwnProject = Boolean(
                    user?.id && project.owner_user_id && project.owner_user_id === user.id
                  );
                  const backActionLabel = isOwnProject ? t('edit') : t('invest');

                  const handleBackAction = (event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();

                    if (isOwnProject) {
                      router.push(`/portfolio?edit=${project.id}`);
                      return;
                    }

                    router.push(`/feed/${project.id}/invest`);
                  };

                  return (
                    <div
                      key={project.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleFlip(project.id)}
                      onKeyDown={(event) => handleCardKeyDown(event, project.id)}
                      className="cursor-pointer text-left [perspective:1400px]"
                    >
                      <div
                        className={`relative h-[232px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-[22px] border border-[#EEF1F7] bg-white shadow-[0_18px_38px_rgba(16,24,40,0.06)] [backface-visibility:hidden]">
                          <div className="relative">
                            <AspectRatio ratio="video" className="h-[174px] w-full">
                              {coverImage ? (
                                <img
                                  src={coverImage}
                                  alt={project.title}
                                  className="h-[174px] w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-[174px] w-full items-center justify-center bg-[linear-gradient(135deg,#EEF2FF_0%,#F7F3FF_100%)] text-xs font-medium text-[#7B8398]">
                                  {t('publishedVenture')}
                                </div>
                              )}
                            </AspectRatio>

                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.16)_100%)]" />

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleWishlist(project.id);
                              }}
                              className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-[#5B4B3E]/70 backdrop-blur-xl transition ${
                                isWishlisted
                                  ? 'text-[#FFD1DB] shadow-[0_12px_24px_rgba(17,24,39,0.18)]'
                                  : 'text-white shadow-[0_12px_24px_rgba(17,24,39,0.14)]'
                              }`}
                              aria-label={isWishlisted ? t('removeFavorite') : t('addFavorite')}
                              aria-pressed={isWishlisted}
                            >
                              <IconHeart filled={isWishlisted} />
                            </button>
                          </div>

                          <div className="flex h-[58px] flex-col justify-between p-2">
                            <p className="line-clamp-2 text-[0.72rem] font-semibold leading-[1.12] tracking-[-0.025em] text-[#162033]">
                              {project.title}
                            </p>
                            <p className="line-clamp-1 text-[0.56rem] font-medium text-[#7C859A]">{categoryLabel}</p>

                            <div className="mt-1 flex items-center justify-between gap-1.5">
                              <div className="inline-flex items-center rounded-full bg-[#F0FFF6] px-2 py-0.5 text-[0.56rem] font-semibold text-[#1A8B5B] shadow-[0_8px_18px_rgba(26,139,91,0.08)]">
                                {rateLabel}
                              </div>
                              <span className="truncate text-[0.54rem] font-medium text-[#B0B7C7]">
                                {t('interestRate')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute inset-0 overflow-hidden rounded-[22px] border border-[#2E3B72] bg-[linear-gradient(160deg,#1B2450_0%,#18203B_48%,#101727_100%)] p-2 text-white shadow-[0_24px_56px_rgba(18,24,42,0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="pointer-events-none absolute inset-x-6 top-4 h-20 rounded-full bg-[#7C5CFF]/25 blur-3xl" />
                          <div className="relative flex h-full flex-col items-center justify-center gap-1.5 text-center">
                            <div className="w-full rounded-[13px] border border-white/10 bg-white/8 px-2.5 py-1.5 backdrop-blur-md">
                              <p className="text-[0.5rem] font-medium uppercase tracking-[0.16em] text-white/58">
                                {t('goal')}
                              </p>
                              <p className="mt-0.5 text-[0.74rem] font-semibold tracking-[-0.025em] text-white">
                                {amountLabel}
                              </p>
                            </div>

                            <div className="w-full rounded-[13px] border border-white/10 bg-white/8 px-2.5 py-1.5 backdrop-blur-md">
                              <p className="text-[0.5rem] font-medium uppercase tracking-[0.16em] text-white/58">
                                {t('raised')}
                              </p>
                              <p className="mt-0.5 text-[0.74rem] font-semibold tracking-[-0.025em] text-white">
                                {raisedLabel}
                              </p>
                            </div>

                            <div className="w-full rounded-[13px] border border-white/10 bg-white/8 px-2.5 py-1.5 backdrop-blur-md">
                              <p className="text-[0.5rem] font-medium uppercase tracking-[0.16em] text-white/58">
                                {t('minimumInvestment')}
                              </p>
                              <p className="mt-0.5 text-[0.7rem] font-semibold tracking-[-0.025em] text-white">
                                {minimumInvestmentLabel}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleBackAction}
                              className="mt-0.5 w-full rounded-full bg-[linear-gradient(135deg,#2BCA7B_0%,#19A864_100%)] px-3 py-2 text-[0.68rem] font-semibold text-white shadow-[0_18px_30px_rgba(25,168,100,0.28)] transition hover:scale-[1.01]"
                            >
                              {backActionLabel}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {showFilterSheet ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0F172A]/28 px-4 pb-[106px] pt-10 backdrop-blur-sm">
          <button
            type="button"
            aria-label={t('closeFilters')}
            className="absolute inset-0"
            onClick={() => setShowFilterSheet(false)}
          />

          <div className="relative w-full max-w-md rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[#EEF1FF]/80 backdrop-blur-2xl">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#D8DDF1]" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[1rem] font-semibold tracking-[-0.03em] text-[#111827]">{t('refineResults')}</p>
                <p className="mt-1 text-[0.82rem] text-[#7A8296]">{t('filterDescription')}</p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.76rem] font-semibold text-[#6B39F4]"
              >
                {t('clearAll')}
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <section>
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#8A92A8]">
                  {t('visibility')}
                </p>
                <button
                  type="button"
                  onClick={() => setDraftFavoritesOnly((value) => !value)}
                  className={`mt-3 flex w-full items-center justify-between rounded-[24px] border px-4 py-4 text-left transition ${
                    draftFavoritesOnly
                      ? 'border-[#D9CCFF] bg-[linear-gradient(135deg,rgba(124,92,255,0.14),rgba(91,72,255,0.10))] text-[#4D2BD6]'
                      : 'border-[#ECEFF8] bg-[#FBFCFF] text-[#4A5368]'
                  }`}
                >
                  <div>
                    <p className="text-[0.9rem] font-semibold tracking-[-0.025em]">{t('favoritesOnly')}</p>
                    <p className="mt-1 text-[0.78rem] text-[#7A8296]">{t('favoritesOnlyDescription')}</p>
                  </div>
                  <span
                    className={`flex h-7 w-12 items-center rounded-full p-1 transition ${
                      draftFavoritesOnly ? 'bg-[#6B39F4]' : 'bg-[#D8DFF0]'
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow-[0_6px_16px_rgba(15,23,42,0.18)] transition ${
                        draftFavoritesOnly ? 'translate-x-5' : ''
                      }`}
                    />
                  </span>
                </button>
              </section>

              <section>
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#8A92A8]">
                  {t('category')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const active = category === draftCategory;

                    return (
                      <button
                        key={`filter-${category}`}
                        type="button"
                        onClick={() => setDraftCategory(category)}
                        className={`rounded-full px-4 py-2.5 text-[0.78rem] font-semibold transition ${
                          active
                            ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_14px_28px_rgba(107,57,244,0.22)]'
                            : 'border border-[#E8ECF8] bg-white text-[#4E576E]'
                        }`}
                      >
                        {category === 'All' ? t('all') : category}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="flex-1 rounded-full border border-[#E5E9F6] bg-white px-4 py-3 text-[0.82rem] font-semibold text-[#4B5565]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-4 py-3 text-[0.82rem] font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.28)]"
              >
                {t('applyFilters')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
    <DesktopMarketplaceLayout
      avatarUrl={avatarUrl}
      categories={categories}
      displayName={profileDisplayName}
      favoritesOnly={favoritesOnly}
      filteredProjects={filteredProjects}
      loading={loading}
      ownerProfiles={ownerProfiles}
      profileRole={profileRoleLabel}
      projects={projects}
      publishDisabled={publishDisabled}
      searchQuery={searchQuery}
      selectedCategory={selectedCategory}
      showSortSelector={showSortSelector}
      sortBy={sortBy}
      status={status}
      wishlist={wishlist}
      onOpenFilter={() => setFavoritesOnly((value) => !value)}
      onOpenProject={openProjectDetail}
      onSearchChange={setSearchQuery}
      onSelectCategory={setSelectedCategory}
      onSelectSort={(nextSort) => {
        setSortBy(nextSort);
        setShowSortSelector(false);
      }}
      onToggleSort={() => {
        setShowFilterSheet(false);
        setShowSortSelector((previous) => !previous);
      }}
      onToggleWishlist={toggleWishlist}
    />
    </>
  );
}
