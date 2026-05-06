'use client';

import { useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import BottomNav from '@/components/BottomNav';
import ProjectPhotoCarousel from '@/components/ProjectPhotoCarousel';
import { useInvestApp } from '@/lib/investapp-context';
import { isProjectPubliclyVisible } from '@/lib/project-status';
import { toEnglishSector } from '@/lib/sector-labels';
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
};

type SortKey = 'latest' | 'rate' | 'progress' | 'goal';

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 2H14M10 21.2361C10.5308 21.7111 11.2316 22 12 22C12.7684 22 13.4692 21.7111 14 21.2361M5.08493 18.5C4.27945 18.5 3.75557 17.7407 4.11579 17.0954L5.43842 14.7258C6.19069 13.3781 6.58234 11.892 6.58234 10.3852V9.76471C6.58234 8.11791 7.49804 6.6627 8.89823 5.78534C8.96478 5.74364 9.03243 5.70324 9.10113 5.6642C9.93938 5.1877 10.9337 4.91176 12 4.91176C13.0663 4.91176 14.0606 5.1877 14.8989 5.6642C14.9676 5.70324 15.0352 5.74364 15.1018 5.78534C16.502 6.6627 17.4177 8.11791 17.4177 9.76471V10.3852C17.4177 11.892 17.8093 13.3781 18.5616 14.7258L19.8842 17.0954C20.2444 17.7407 19.7205 18.5 18.9151 18.5H15H9H5.08493Z" />
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

const toCssImageUrl = (value: string | null | undefined) => (value ? `url(${JSON.stringify(value)})` : '');

const getProjectCoverImage = (project: FeedProject) => project.photo_urls?.[0] ?? null;

const getOwnerAvatarImage = (
  project: FeedProject,
  ownerProfiles: Record<string, RecipientDirectoryEntry>
) => {
  const owner = project.owner_user_id ? ownerProfiles[project.owner_user_id] : null;
  return owner?.avatar_url ?? getProjectCoverImage(project);
};

const getFeaturedSubtitle = (project: FeedProject) => {
  const sector = toEnglishSector(project.sector);
  if (project.city && sector) return `${sector} in ${project.city}`;
  if (project.city) return project.city;
  if (sector) return sector;
  return 'Published venture';
};

const SURFACE_CLASSNAME =
  'rounded-[30px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,248,255,0.94)_100%)] shadow-[0_24px_70px_rgba(20,28,55,0.08)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl';

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'latest', label: 'Latest first' },
  { id: 'rate', label: 'Highest rate' },
  { id: 'progress', label: 'Funding progress' },
  { id: 'goal', label: 'Funding goal' },
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
  if (loading) {
    return (
      <div className="-mx-1 mt-4 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`featured-reel-loading-${index}`}
            className="h-[170px] w-[100px] shrink-0 animate-pulse rounded-[22px] bg-[#E8ECF7]"
          />
        ))}
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="-mx-1 mt-4 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {projects.map((project) => {
        const coverImage = getProjectCoverImage(project);
        const avatarImage = getOwnerAvatarImage(project, ownerProfiles);
        const cardBackground = coverImage
          ? `linear-gradient(180deg,rgba(10,16,32,0.04)_0%,rgba(10,16,32,0.28)_38%,rgba(7,10,18,0.78)_100%),${toCssImageUrl(coverImage)}`
          : 'linear-gradient(145deg,#1B2450_0%,#332065_54%,#111827_100%)';

        return (
          <button
            key={`featured-reel-${project.id}`}
            type="button"
            onClick={() => onOpenProject(project.id)}
            className="group relative h-[170px] w-[100px] shrink-0 snap-start overflow-hidden rounded-[22px] bg-cover bg-center text-left shadow-[0_18px_34px_rgba(17,24,39,0.18)] ring-1 ring-black/5 transition active:scale-[0.98]"
            style={{ backgroundImage: cardBackground }}
          >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_42%)] opacity-80" />

            <span
              className="absolute left-3 top-3 h-9 w-9 rounded-full border-2 border-white bg-[#EEF2FF] bg-cover bg-center shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
              style={{
                backgroundImage: avatarImage ? toCssImageUrl(avatarImage) : undefined,
              }}
              aria-hidden="true"
            />

            <span className="absolute inset-x-3 bottom-3">
              <span className="line-clamp-3 text-[0.88rem] font-semibold leading-[1.12] tracking-[-0.04em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.36)]">
                {project.title}
              </span>
              <span className="mt-1 line-clamp-1 block text-[0.62rem] font-medium text-white/86 drop-shadow-[0_2px_8px_rgba(0,0,0,0.30)]">
                {getFeaturedSubtitle(project)}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#8A63FF_0%,#6B39F4_100%)] px-2.5 py-1 text-[0.58rem] font-bold text-white shadow-[0_10px_18px_rgba(107,57,244,0.32)]">
                <IconCrown />
                Destacado
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const { user, getAccessToken } = usePrivy();
  const { faseApp, rolSeleccionado } = useInvestApp();
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

  useEffect(() => {
    if (faseApp === 'login') router.replace('/login');
    if (faseApp === 'onboarding') router.replace('/onboarding');
  }, [faseApp, router]);

  useEffect(() => {
    const loadFeed = async () => {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.10),transparent_28%),linear-gradient(180deg,#FAFAFE_0%,#F5F6FC_55%,#F7F8FC_100%)] text-[#162033]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.12),transparent_52%),radial-gradient(circle_at_top_right,rgba(67,120,255,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-8 top-24 h-40 rounded-full bg-[#C8BCFF]/16 blur-3xl" />

      {showSortSelector ? (
        <button
          type="button"
          aria-label="Close sort selector"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setShowSortSelector(false)}
        />
      ) : null}

      <div className="relative mx-auto flex h-screen w-full max-w-md flex-col px-4 pb-[116px] pt-4">
        <header className="mb-4 flex items-center justify-center">
          <p className="text-[0.92rem] font-semibold tracking-[-0.03em] text-[#2A3245]">
            investup.onrender.com
          </p>
        </header>

        <section className={`${SURFACE_CLASSNAME} relative z-20 flex min-h-0 flex-1 flex-col overflow-visible p-3.5`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <InvestAppWordmark />
              <h1 className="mt-3 text-[2.05rem] font-semibold tracking-[-0.06em] text-[#111827]">
                Oportunities
              </h1>
              <p className="mt-1 text-[0.84rem] leading-5 text-[#858EA2]">
                Projects published by entrepreneurs
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/notifications')}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#EEE9FF] bg-[#F7F4FF] text-[#7C5CFF] shadow-[0_16px_30px_rgba(107,57,244,0.10)] transition hover:scale-[1.01]"
              aria-label="Notifications"
            >
              <IconBell />
            </button>
          </div>

          {rolSeleccionado === 'emprendedor' ? (
            <button
              type="button"
              onClick={() => {
                if (!publishDisabled) router.push('/publish');
              }}
              disabled={publishDisabled}
              className={`mt-4 flex w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left shadow-[0_16px_34px_rgba(107,57,244,0.10)] transition ${
                publishDisabled
                  ? 'cursor-not-allowed border-[#E6E8F2] bg-[#F4F5F8] opacity-75'
                  : 'border-[#E6DFFF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F4EEFF_100%)] hover:-translate-y-0.5'
              }`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_16px_28px_rgba(107,57,244,0.22)] ${
                  publishDisabled
                    ? 'bg-[#C8CBE0]'
                    : 'bg-[linear-gradient(135deg,#7C5CFF_0%,#5B48FF_100%)]'
                }`}
              >
                <IconPlus />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-[-0.02em] text-[#1C2336]">
                  Publish project
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#7B879C]">
                  {loadingOwnProject
                    ? 'Checking your current business listing...'
                    : hasOwnProject
                      ? 'You already have one business. Edit it from portfolio.'
                      : 'Add your business listing with the guided flow.'}
                </span>
              </span>
            </button>
          ) : null}

          <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#EEF0F8] bg-[#FAF9FF] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <span className="text-[#9AA3B6]">
              <IconSearch />
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search ventures, entrepreneurs or keywords..."
              className="h-6 w-full border-none bg-transparent text-[0.84rem] font-medium tracking-[-0.02em] text-[#162033] outline-none placeholder:text-[#A0A8BA]"
              aria-label="Search ventures"
            />
          </div>

          <FeaturedReelsCarousel
            loading={loading}
            ownerProfiles={ownerProfiles}
            projects={featuredProjects}
            onOpenProject={(projectId) => router.push(`/feed/${projectId}`)}
          />

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {categories.map((category) => {
              const active = category === selectedCategory;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`shrink-0 rounded-full px-3.5 py-2 text-[0.7rem] font-semibold tracking-[-0.01em] transition ${
                    active
                      ? 'border border-[#CFC3FF] bg-[linear-gradient(135deg,#FFFFFF_0%,#F4EEFF_100%)] text-[#6B39F4] shadow-[0_10px_22px_rgba(107,57,244,0.12)]'
                      : 'border border-[#EEF1F8] bg-white text-[#596277] shadow-[0_8px_18px_rgba(27,36,53,0.04)]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-[#6B39F4] shadow-[0_10px_24px_rgba(107,57,244,0.10)]">
                <IconSpark />
              </span>
              <div>
                <p className="text-[0.94rem] font-semibold tracking-[-0.03em] text-[#101828]">
                  Suggested for you
                </p>
                <p className="mt-0.5 text-[0.72rem] text-[#8A92A8]">Handpicked opportunities</p>
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={openFilterSheet}
                className="flex h-9 items-center gap-1.5 rounded-full border border-[#E9E4FF] bg-white px-3 text-[0.68rem] font-semibold text-[#6736F3] shadow-[0_10px_20px_rgba(107,57,244,0.08)] transition hover:scale-[1.01]"
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
                className="flex h-9 items-center gap-1.5 rounded-full border border-[#E8ECF8] bg-white px-3 text-[0.68rem] font-semibold text-[#445067] shadow-[0_10px_20px_rgba(22,32,51,0.06)] transition hover:scale-[1.01]"
              >
                <IconSort />
                Sort
              </button>

              {showSortSelector ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[204px] rounded-[24px] border border-white/85 bg-white/96 p-2 shadow-[0_26px_70px_rgba(17,24,39,0.18)] ring-1 ring-[#EEF0FF]/80 backdrop-blur-2xl">
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
                        <span>{option.label}</span>
                        {active ? <IconSpark /> : <IconChevronDown />}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-2 pr-1">
            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`feed-loading-${index}`}
                    className="h-[232px] animate-pulse rounded-[22px] border border-[#EEF1F7] bg-white p-2.5 shadow-[0_18px_36px_rgba(18,27,48,0.05)]"
                  >
                    <div className="h-[112px] rounded-[16px] bg-[#EAEFFC]" />
                    <div className="mt-3 h-4 rounded-full bg-[#EEF2FC]" />
                    <div className="mt-2 h-4 w-4/5 rounded-full bg-[#EEF2FC]" />
                    <div className="mt-4 h-7 w-20 rounded-full bg-[#E8F8EE]" />
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && status ? (
              <div className="rounded-[22px] border border-[#EEF1F7] bg-white p-4 shadow-[0_18px_36px_rgba(18,27,48,0.05)]">
                <p className="text-sm font-semibold text-[#152033]">We couldn&apos;t load the marketplace.</p>
                <p className="mt-1 text-sm leading-6 text-[#70798D]">{status}</p>
              </div>
            ) : null}

            {!loading && !status && filteredProjects.length === 0 ? (
              <div className="rounded-[22px] border border-[#EEF1F7] bg-white p-5 text-center shadow-[0_18px_36px_rgba(18,27,48,0.05)]">
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
              <div className="grid grid-cols-2 gap-3">
                {filteredProjects.map((project) => {
                  const isFlipped = flippedId === project.id;
                  const isWishlisted = wishlist.includes(project.id);
                  const amountLabel = formatAmount(project.amount_requested, project.currency);
                  const raisedLabel = formatAmount(project.amount_received, project.currency);
                  const minimumInvestmentLabel = formatAmount(
                    project.minimum_investment,
                    project.currency
                  );
                  const rateLabel = project.interest_rate ? `${project.interest_rate}% EA` : 'Rate pending';
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
                        className={`relative h-[232px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                          isFlipped ? '[transform:rotateY(180deg)]' : ''
                        }`}
                      >
                        <div className="absolute inset-0 overflow-hidden rounded-[22px] border border-[#EEF1F7] bg-white shadow-[0_18px_38px_rgba(16,24,40,0.06)] [backface-visibility:hidden]">
                          <div className="relative">
                            <ProjectPhotoCarousel
                              images={project.photo_urls}
                              alt={project.title}
                              className="h-[112px] w-full"
                              imageClassName="h-[112px] w-full object-cover"
                              emptyClassName="flex h-[112px] w-full items-center justify-center bg-[linear-gradient(135deg,#EEF2FF_0%,#F7F3FF_100%)] text-xs font-medium text-[#7B8398]"
                              stopPropagation
                            />

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
                              aria-label={isWishlisted ? 'Remove from favorites' : 'Add to favorites'}
                              aria-pressed={isWishlisted}
                            >
                              <IconHeart filled={isWishlisted} />
                            </button>
                          </div>

                          <div className="flex h-[calc(100%-112px)] flex-col justify-between p-2.5">
                            <div>
                              <p className="line-clamp-3 text-[0.92rem] font-semibold leading-[1.22] tracking-[-0.03em] text-[#162033]">
                                {project.title}
                              </p>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <div className="inline-flex items-center rounded-full bg-[#F0FFF6] px-2.5 py-1 text-[0.66rem] font-semibold text-[#1A8B5B] shadow-[0_8px_18px_rgba(26,139,91,0.08)]">
                                {rateLabel}
                              </div>
                              <span className="text-[0.62rem] font-medium text-[#B0B7C7]">
                                Interest rate
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="absolute inset-0 overflow-hidden rounded-[22px] border border-[#2E3B72] bg-[linear-gradient(160deg,#1B2450_0%,#18203B_48%,#101727_100%)] p-3 text-white shadow-[0_24px_56px_rgba(18,24,42,0.24)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                          <div className="pointer-events-none absolute inset-x-6 top-4 h-20 rounded-full bg-[#7C5CFF]/25 blur-3xl" />
                          <div className="relative flex h-full flex-col items-center justify-center gap-2.5 text-center">
                            <div className="w-full rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                              <p className="text-[0.64rem] font-medium uppercase tracking-[0.18em] text-white/58">
                                Goal
                              </p>
                              <p className="mt-1.5 text-[0.92rem] font-semibold tracking-[-0.03em] text-white">
                                {amountLabel}
                              </p>
                            </div>

                            <div className="w-full rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                              <p className="text-[0.64rem] font-medium uppercase tracking-[0.18em] text-white/58">
                                Raised
                              </p>
                              <p className="mt-1.5 text-[0.92rem] font-semibold tracking-[-0.03em] text-white">
                                {raisedLabel}
                              </p>
                            </div>

                            <div className="w-full rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur-md">
                              <p className="text-[0.64rem] font-medium uppercase tracking-[0.18em] text-white/58">
                                Minimum investment
                              </p>
                              <p className="mt-1.5 text-[0.88rem] font-semibold tracking-[-0.03em] text-white">
                                {minimumInvestmentLabel}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleBackAction}
                              className="mt-1 w-full rounded-full bg-[linear-gradient(135deg,#2BCA7B_0%,#19A864_100%)] px-3 py-3 text-[0.74rem] font-semibold text-white shadow-[0_18px_30px_rgba(25,168,100,0.28)] transition hover:scale-[1.01]"
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
