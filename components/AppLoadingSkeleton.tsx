'use client';

type AppLoadingSkeletonProps = {
  compact?: boolean;
};

export default function AppLoadingSkeleton({ compact = false }: AppLoadingSkeletonProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,92,255,0.12),transparent_34%),linear-gradient(180deg,#FAFAFE_0%,#F6F7FC_58%,#F8F9FD_100%)] pb-32 text-[#101828]">
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
