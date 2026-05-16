'use client';

type AppLoadingSkeletonProps = {
  compact?: boolean;
};

export default function AppLoadingSkeleton({ compact = false }: AppLoadingSkeletonProps) {
  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_58%,#F8F9FD_100%)] pb-32 text-[#101828] lg:hidden">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-8 pt-8">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-5 w-28 rounded-full bg-[#E8E4F8]" />
                <div className="mt-4 h-8 w-44 rounded-full bg-[#E2DDF4]" />
              </div>
              <div className="h-12 w-12 rounded-full bg-[#E8E4F8]" />
            </div>

            <section className="rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_24px_70px_rgba(31,38,64,0.10)] ring-1 ring-[#EDEFFA]/75">
              <div className="h-40 rounded-[24px] bg-[linear-gradient(135deg,#ECE8FF_0%,#F5F7FF_100%)]" />
              <div className="mt-4 h-4 w-3/4 rounded-full bg-[#E8ECF7]" />
              <div className="mt-3 h-4 w-1/2 rounded-full bg-[#EEF1F8]" />
            </section>

            {!compact ? (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-white/90 shadow-[0_14px_28px_rgba(31,38,64,0.06)]" />
                      <div className="h-3 w-12 rounded-full bg-[#E8ECF7]" />
                    </div>
                  ))}
                </div>

                <section className="rounded-[30px] border border-white/85 bg-white/88 p-4 shadow-[0_20px_54px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75">
                  <div className="h-5 w-36 rounded-full bg-[#E2DDF4]" />
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-[22px] bg-[#F8F9FD] p-3">
                        <div className="h-12 w-12 rounded-full bg-[#E8E4F8]" />
                        <div className="min-w-0 flex-1">
                          <div className="h-4 w-2/3 rounded-full bg-[#E4E8F4]" />
                          <div className="mt-2 h-3 w-1/2 rounded-full bg-[#EEF1F8]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </main>

      <main className="hidden min-h-screen bg-[#F8F9FB] text-[#101828] lg:block">
        <div className="animate-pulse">
          <aside className="fixed inset-y-0 left-0 z-30 w-[260px] border-r border-[#E7EAF3] bg-white px-5 py-6">
            <div className="mx-auto h-9 w-40 rounded-2xl bg-[#E8E4F8]" />
            <div className="mt-10 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`desktop-nav-${index}`} className="h-11 rounded-2xl bg-[#F3F5FB]" />
              ))}
            </div>
            <div className="mt-8 h-px bg-[#E7EAF3]" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`desktop-profile-nav-${index}`} className="h-10 rounded-2xl bg-[#F6F7FC]" />
              ))}
            </div>
            {!compact ? (
              <div className="absolute bottom-6 left-5 right-5 h-44 rounded-[24px] border border-[#EDE7FF] bg-[linear-gradient(160deg,#FFFFFF_0%,#F4F0FF_100%)]" />
            ) : null}
          </aside>

          <div className="min-h-screen pl-[260px]">
            <header className="sticky top-0 z-20 flex h-[68px] items-center gap-4 border-b border-[#E7EAF3] bg-white/86 px-5 backdrop-blur-xl xl:px-6">
              <div className="h-10 w-full max-w-[620px] rounded-xl border border-[#DDE2EE] bg-white shadow-[0_12px_28px_rgba(21,28,44,0.04)]" />
              <div className="ml-auto flex items-center gap-3 pl-16">
                <div className="h-10 w-10 rounded-xl bg-white shadow-[0_12px_28px_rgba(21,28,44,0.05)]" />
                <div className="h-10 w-40 rounded-xl bg-[#E8E4F8]" />
                <div className="h-11 w-48 rounded-2xl bg-white shadow-[0_12px_28px_rgba(21,28,44,0.05)]" />
              </div>
            </header>

            <section className="px-5 py-5 xl:px-7 2xl:px-9">
              <div className="space-y-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.75fr)]">
                  <div className="h-[280px] rounded-[28px] border border-[#E8ECF5] bg-white shadow-[0_18px_48px_rgba(21,28,44,0.06)]" />
                  <div className="h-[280px] rounded-[28px] border border-[#E8ECF5] bg-white shadow-[0_18px_48px_rgba(21,28,44,0.06)]" />
                </div>

                {!compact ? (
                  <>
                    <div className="grid gap-4 xl:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={`desktop-metric-${index}`} className="h-32 rounded-[24px] border border-[#E8ECF5] bg-white shadow-[0_14px_34px_rgba(21,28,44,0.05)]" />
                      ))}
                    </div>
                    <div className="grid gap-4 xl:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={`desktop-card-${index}`} className="h-56 rounded-[24px] border border-[#E8ECF5] bg-white shadow-[0_14px_34px_rgba(21,28,44,0.05)]" />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[360px] rounded-[28px] border border-[#E8ECF5] bg-white shadow-[0_18px_48px_rgba(21,28,44,0.06)]" />
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

export function SectionLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-[26px] border border-white/85 bg-white/88 p-4 shadow-[0_18px_42px_rgba(31,38,64,0.08)] ring-1 ring-[#EDEFFA]/75">
      <div className="h-5 w-36 rounded-full bg-[#E2DDF4]" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-[20px] bg-[#F8F9FD] p-3">
            <div className="h-11 w-11 rounded-full bg-[#E8E4F8]" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-2/3 rounded-full bg-[#E4E8F4]" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-[#EEF1F8]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
