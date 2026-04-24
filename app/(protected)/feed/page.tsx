'use client';

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import EntrepreneurFeedDashboard from '@/components/EntrepreneurFeedDashboard';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestApp } from '@/lib/investapp-context';
import { getProjectRepaymentTermMonths, isProjectPubliclyVisible } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
import { readWishlist, writeWishlist } from '@/lib/wishlist-storage';
import { fetchProjects } from '@/utils/client/projects';

type FeedProject = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  owner_user_id: string | null;
  status: string | null;
  amount_requested: number | null;
  amount_received: number | null;
  currency: string | null;
  term_months: number | null;
  installment_count: number | null;
  interest_rate: number | null;
  city: string | null;
  country: string | null;
  publication_end_date: string | null;
  photo_urls: string[] | null;
};

type SortKey = 'latest' | 'rate' | 'progress' | 'goal';

function IconClose() {
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
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function IconMenu() {
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
      <path d="M7 7H17" />
      <path d="M10 12H17" />
      <path d="M13 17H17" />
      <path d="M7 7H7.01" />
      <path d="M7 12H7.01" />
      <path d="M7 17H7.01" />
    </svg>
  );
}

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

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v4l2 2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 19L19 5" />
      <circle cx="7" cy="7" r="2" />
      <circle cx="17" cy="17" r="2" />
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

function formatAmount(amount: number | null, currency: string | null) {
  if (amount === null || amount === undefined) return 'No amount';
  const code = currency ?? 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
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

const SURFACE_CLASSNAME =
  'rounded-[30px] border border-white/85 bg-white/88 shadow-[0_22px_60px_rgba(20,28,55,0.08)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl';

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'latest', label: 'Latest first' },
  { id: 'rate', label: 'Highest rate' },
  { id: 'progress', label: 'Funding progress' },
  { id: 'goal', label: 'Funding goal' },
];

const CATEGORY_PREFERRED_ORDER = ['Tech', 'Commerce', 'Food', 'Health'];

export default function FeedPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
  const [projects, setProjects] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadFeed = async () => {
      if (rolSeleccionado === 'emprendedor') {
        setProjects([]);
        setLoading(false);
        setStatus('');
        return;
      }

      setLoading(true);
      setStatus('');
      const { data, error } = await fetchProjects({ limit: 48 });

      if (error) {
        setStatus(`Could not load the feed: ${error}`);
        setLoading(false);
        return;
      }

      const normalizedProjects = ((data ?? []) as FeedProject[]).map((project) => ({
        ...project,
        photo_urls: normalizePhotos(project.photo_urls),
      }));
      const visibleProjects = normalizedProjects.filter((project) => isProjectPubliclyVisible(project));
      setProjects(visibleProjects);
      setLoading(false);
    };

    loadFeed();
  }, [rolSeleccionado]);

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

  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.id === sortBy)?.label ?? SORT_OPTIONS[0].label;

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

  if (rolSeleccionado === 'emprendedor') {
    return <EntrepreneurFeedDashboard />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#F8FAFF_0%,#F4F6FB_48%,#EEF2FF_100%)] text-[#162033]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.16),transparent_56%),radial-gradient(circle_at_top_right,rgba(67,120,255,0.12),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-24 h-48 rounded-full bg-[#C8BCFF]/20 blur-3xl" />

      {showSortSelector ? (
        <button
          type="button"
          aria-label="Close sort selector"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setShowSortSelector(false)}
        />
      ) : null}

      <div className="relative mx-auto flex h-screen w-full max-w-md flex-col px-4 pb-[116px] pt-4">
        <header className="relative z-20 space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/home')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#1B2435] shadow-[0_18px_40px_rgba(31,41,72,0.12)] ring-1 ring-[#EEF2FF] backdrop-blur-xl transition hover:scale-[1.01]"
              aria-label="Close marketplace"
            >
              <IconClose />
            </button>

            <p className="text-[0.88rem] font-semibold tracking-[-0.03em] text-[#2A3245]">
              investapp.co
            </p>

            <button
              type="button"
              onClick={() => router.push('/profile')}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-white/90 text-[#6B39F4] shadow-[0_18px_40px_rgba(31,41,72,0.12)] ring-1 ring-[#EEF2FF] backdrop-blur-xl transition hover:scale-[1.01]"
              aria-label="Open menu"
            >
              <IconMenu />
            </button>
          </div>

          <div className="space-y-2 px-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#8D96AB]">
              InvestApp
            </p>
            <div>
              <h1 className="text-[2.05rem] font-semibold tracking-[-0.055em] text-[#111827]">
                MarketPlace
              </h1>
              <p className="mt-1 text-[0.92rem] leading-6 text-[#6E778B]">
                Projects published by entrepreneurs
              </p>
            </div>
          </div>

          <div className={`${SURFACE_CLASSNAME} p-2.5`}>
            <div className="flex items-center gap-3 rounded-[24px] border border-[#E8EDFA] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFCFF_100%)] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_30px_rgba(46,56,86,0.06)]">
              <span className="text-[#8E98AD]">
                <IconSearch />
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search ventures, entrepreneurs or keywords..."
                className="h-7 w-full border-none bg-transparent text-[0.95rem] font-medium tracking-[-0.025em] text-[#162033] outline-none placeholder:text-[#9AA3B6]"
                aria-label="Search ventures"
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((category) => {
              const active = category === selectedCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-4 py-2.5 text-[0.76rem] font-semibold tracking-[-0.02em] transition ${
                    active
                      ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_18px_32px_rgba(107,57,244,0.28)]'
                      : 'border border-white/75 bg-white/80 text-[#596277] shadow-[0_12px_28px_rgba(27,36,53,0.06)] backdrop-blur-xl'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className={`${SURFACE_CLASSNAME} relative overflow-visible p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[1rem] font-semibold tracking-[-0.03em] text-[#101828]">
                  Suggested for you
                </p>
                <p className="mt-1 text-[0.8rem] text-[#7A8296]">Handpicked opportunities</p>
              </div>

              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={openFilterSheet}
                  className="flex h-10 items-center gap-2 rounded-full border border-[#E9E4FF] bg-[#F7F4FF] px-3 text-[0.72rem] font-semibold text-[#6736F3] shadow-[0_12px_24px_rgba(107,57,244,0.10)] transition hover:scale-[1.01]"
                >
                  <IconFilter />
                  Filter
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowFilterSheet(false);
                    setShowSortSelector((previous) => !previous);
                  }}
                  className="flex h-10 items-center gap-2 rounded-full border border-[#E8ECF8] bg-white px-3 text-[0.72rem] font-semibold text-[#445067] shadow-[0_12px_24px_rgba(22,32,51,0.07)] transition hover:scale-[1.01]"
                >
                  <IconSort />
                  Sort
                </button>

                {showSortSelector ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[214px] rounded-[26px] border border-white/85 bg-white/96 p-2 shadow-[0_26px_70px_rgba(17,24,39,0.18)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl">
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
                          className={`flex w-full items-center justify-between rounded-[20px] px-3 py-3 text-left text-[0.82rem] font-medium tracking-[-0.02em] transition ${
                            active
                              ? 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] text-white shadow-[0_16px_28px_rgba(107,57,244,0.22)]'
                              : 'text-[#3E475B] hover:bg-[#F7F7FE]'
                          }`}
                        >
                          <span>{option.label}</span>
                          {active ? <IconSpark /> : <IconChevronDown />}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[24px] bg-[linear-gradient(135deg,rgba(107,57,244,0.08),rgba(66,120,255,0.05))] px-3.5 py-3">
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8B92A6]">
                  Active results
                </p>
                <p className="mt-1 text-[1.1rem] font-semibold tracking-[-0.04em] text-[#111827]">
                  {loading ? '--' : filteredProjects.length}
                </p>
              </div>

              <div className="text-right">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#8B92A6]">
                  Sort
                </p>
                <p className="mt-1 text-[0.83rem] font-medium text-[#4F5870]">{selectedSortLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <div className="h-full overflow-y-auto pb-6">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 pr-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`feed-loading-${index}`}
                    className="h-[270px] animate-pulse rounded-[28px] border border-white/80 bg-white/70 p-3 shadow-[0_20px_44px_rgba(18,27,48,0.06)]"
                  >
                    <div className="h-36 rounded-[22px] bg-[#EAEFFC]" />
                    <div className="mt-4 h-5 rounded-full bg-[#EEF2FC]" />
                    <div className="mt-2 h-5 w-3/4 rounded-full bg-[#EEF2FC]" />
                    <div className="mt-5 h-8 w-24 rounded-full bg-[#E8F8EE]" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && status ? (
              <div className={`${SURFACE_CLASSNAME} p-4`}>
                <p className="text-sm font-semibold text-[#152033]">We couldn&apos;t load the marketplace.</p>
                <p className="mt-1 text-sm leading-6 text-[#70798D]">{status}</p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length === 0 ? (
              <div className={`${SURFACE_CLASSNAME} p-5 text-center`}>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(124,92,255,0.14),rgba(67,120,255,0.10))] text-[#6B39F4] shadow-[0_16px_30px_rgba(107,57,244,0.12)]">
                  <IconSearch />
                </div>
                <p className="mt-4 text-[1rem] font-semibold tracking-[-0.03em] text-[#152033]">
                  No ventures match your search
                </p>
                <p className="mt-2 text-sm leading-6 text-[#70798D]">
                  Try another keyword, clear the filters, or switch category to explore more opportunities.
                </p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 pr-1">
                {filteredProjects.map((project) => {
                  const isFlipped = flippedId === project.id;
                  const isWishlisted = wishlist.includes(project.id);
                  const amountLabel = formatAmount(project.amount_requested, project.currency);
                  const raisedLabel = formatAmount(project.amount_received, project.currency);
                  const repaymentTerm = getProjectRepaymentTermMonths(project);
                  const termLabel = repaymentTerm ? `${repaymentTerm} months` : '--';
                  const rateLabel = project.interest_rate ? `${project.interest_rate}% EA` : 'Rate pending';
                  const progress = calculateProgress(project.amount_received, project.amount_requested);
                  const isOwnProject = Boolean(
                    user?.id && project.owner_user_id && project.owner_user_id === user.id
                  );
                  const backActionLabel = isOwnProject ? 'Edit' : 'Invest';

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
                        className={`relative h-[282px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/85 bg-white/86 shadow-[0_26px_60px_rgba(16,24,40,0.10)] ring-1 ring-[#EEF2FF]/75 backdrop-blur-2xl [backface-visibility:hidden]">
                          <div className="relative">
                            <ProjectPhotoCarousel
                              images={project.photo_urls}
                              alt={project.title}
                              className="h-[168px] w-full"
                              imageClassName="h-[168px] w-full object-cover"
                              emptyClassName="flex h-[168px] w-full items-center justify-center bg-[linear-gradient(135deg,#EEF2FF_0%,#F7F3FF_100%)] text-xs font-medium text-[#7B8398]"
                              stopPropagation
                            />

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,transparent_0%,rgba(17,24,39,0.55)_100%)]" />

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleWishlist(project.id);
                              }}
                              className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/35 bg-white/80 backdrop-blur-xl transition ${
                                isWishlisted
                                  ? 'text-[#F0527A] shadow-[0_16px_30px_rgba(240,82,122,0.22)]'
                                  : 'text-[#5A6478] shadow-[0_16px_30px_rgba(17,24,39,0.10)]'
                              }`}
                              aria-label={isWishlisted ? 'Remove from favorites' : 'Add to favorites'}
                              aria-pressed={isWishlisted}
                            >
                              <IconHeart filled={isWishlisted} />
                            </button>

                            <div className="absolute left-3 top-3 rounded-full border border-[#CFF5D8] bg-[#F2FFF6]/95 px-2.5 py-1 text-[0.62rem] font-semibold tracking-[-0.01em] text-[#16784A] shadow-[0_10px_24px_rgba(11,131,85,0.12)]">
                              {rateLabel}
                            </div>
                          </div>

                          <div className="flex h-[calc(100%-168px)] flex-col justify-between p-3.5">
                            <div>
                              <p className="line-clamp-2 text-[0.98rem] font-semibold leading-5 tracking-[-0.03em] text-[#162033]">
                                {project.title}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[0.68rem] font-medium text-[#8A92A8]">
                              <span>Tap to flip</span>
                              <span>{Math.round(progress)}% funded</span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute inset-0 overflow-hidden rounded-[28px] border border-[#2E3B72] bg-[linear-gradient(160deg,#1B2450_0%,#18203B_48%,#101727_100%)] p-3.5 text-white shadow-[0_28px_70px_rgba(18,24,42,0.28)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="pointer-events-none absolute inset-x-6 top-4 h-20 rounded-full bg-[#7C5CFF]/25 blur-3xl" />
                          <div className="relative flex h-full flex-col">
                            <div>
                              <p className="line-clamp-2 text-[0.95rem] font-semibold leading-5 tracking-[-0.03em] text-white">
                                {project.title}
                              </p>
                              <p className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-white/55">
                                Investment overview
                              </p>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2">
                              <div className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-white/68">
                                  <IconTarget />
                                  <span className="text-[0.64rem] uppercase tracking-[0.18em]">Goal</span>
                                </div>
                                <p className="mt-2 text-[0.88rem] font-semibold tracking-[-0.03em] text-white">
                                  {amountLabel}
                                </p>
                              </div>

                              <div className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                                <div className="flex items-center gap-2 text-white/68">
                                  <IconTarget />
                                  <span className="text-[0.64rem] uppercase tracking-[0.18em]">Raised</span>
                                </div>
                                <p className="mt-2 text-[0.88rem] font-semibold tracking-[-0.03em] text-white">
                                  {raisedLabel}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                                  <div className="flex items-center gap-2 text-white/68">
                                    <IconClock />
                                    <span className="text-[0.64rem] uppercase tracking-[0.18em]">Term</span>
                                  </div>
                                  <p className="mt-2 text-[0.8rem] font-semibold tracking-[-0.02em] text-white">
                                    {termLabel}
                                  </p>
                                </div>

                                <div className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                                  <div className="flex items-center gap-2 text-white/68">
                                    <IconPercent />
                                    <span className="text-[0.64rem] uppercase tracking-[0.18em]">Rate</span>
                                  </div>
                                  <p className="mt-2 text-[0.8rem] font-semibold tracking-[-0.02em] text-white">
                                    {rateLabel}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between text-[0.68rem] font-medium text-white/65">
                                <span>Funding progress</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-white/12">
                                <div
                                  className="h-2 rounded-full bg-[linear-gradient(90deg,#7C5CFF_0%,#5B8CFF_55%,#55D6A6_100%)] shadow-[0_0_18px_rgba(124,92,255,0.55)]"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>

                            <div className="mt-auto flex items-center gap-2 pt-4">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  router.push(`/feed/${project.id}`);
                                }}
                                className="flex-1 rounded-full border border-white/18 bg-white/10 px-3 py-2.5 text-[0.72rem] font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={handleBackAction}
                                className="flex-1 rounded-full bg-white px-3 py-2.5 text-[0.72rem] font-semibold text-[#162033] shadow-[0_12px_24px_rgba(255,255,255,0.18)] transition hover:scale-[1.01]"
                              >
                                {backActionLabel}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showFilterSheet ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0F172A]/28 px-4 pb-[106px] pt-10 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0"
            onClick={() => setShowFilterSheet(false)}
          />

          <div className="relative w-full max-w-md rounded-[32px] border border-white/80 bg-white/96 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.24)] ring-1 ring-[#EEF1FF]/80 backdrop-blur-2xl">
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#D8DDF1]" />

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[1rem] font-semibold tracking-[-0.03em] text-[#111827]">Refine results</p>
                <p className="mt-1 text-[0.82rem] text-[#7A8296]">Apply quick filters for your next venture</p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[0.76rem] font-semibold text-[#6B39F4]"
              >
                Clear all
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <section>
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.18em] text-[#8A92A8]">
                  Visibility
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
                    <p className="text-[0.9rem] font-semibold tracking-[-0.025em]">Favorites only</p>
                    <p className="mt-1 text-[0.78rem] text-[#7A8296]">Show the ventures you already saved</p>
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
                  Category
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
                        {category}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 rounded-full bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)] px-4 py-3 text-[0.82rem] font-semibold text-white shadow-[0_18px_34px_rgba(107,57,244,0.28)]"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
