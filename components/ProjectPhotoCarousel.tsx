'use client';

import { useMemo, useState } from 'react';

type ProjectPhotoCarouselProps = {
  images?: string[] | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  emptyClassName?: string;
  stopPropagation?: boolean;
};

export default function ProjectPhotoCarousel({
  images,
  alt,
  className,
  imageClassName,
  emptyClassName,
  stopPropagation,
}: ProjectPhotoCarouselProps) {
  const slides = useMemo(
    () => (images ?? []).filter((image): image is string => Boolean(image && image.trim())),
    [images]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const hasSlides = slides.length > 0;
  const hasMultipleSlides = slides.length > 1;

  const goToIndex = (index: number) => {
    if (!hasSlides) return;
    const normalized = (index + slides.length) % slides.length;
    setCurrentIndex(normalized);
  };

  const showPrevious = (event?: React.SyntheticEvent) => {
    if (stopPropagation) event?.stopPropagation();
    goToIndex(currentIndex - 1);
  };

  const showNext = (event?: React.SyntheticEvent) => {
    if (stopPropagation) event?.stopPropagation();
    goToIndex(currentIndex + 1);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (stopPropagation) event.stopPropagation();
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (stopPropagation) event.stopPropagation();
    if (touchStartX === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) > 35) {
      if (deltaX < 0) showNext();
      if (deltaX > 0) showPrevious();
    }
    setTouchStartX(null);
  };

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (stopPropagation) event.stopPropagation();
  };

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hasSlides ? (
        <img
          src={slides[currentIndex]}
          alt={`${alt} ${currentIndex + 1}`}
          className={imageClassName ?? 'h-full w-full object-cover'}
        />
      ) : (
        <div
          className={
            emptyClassName ??
            'flex h-full w-full items-center justify-center rounded-2xl bg-white/20 text-xs text-slate-500 backdrop-blur-md'
          }
        >
          Sin imagen
        </div>
      )}

      {hasMultipleSlides ? (
        <>
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md"
          >
            <span className="text-lg leading-none">‹</span>
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Foto siguiente"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md"
          >
            <span className="text-lg leading-none">›</span>
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1 backdrop-blur-md">
            {slides.map((_, index) => (
              <button
                key={`slide-dot-${index}`}
                type="button"
                onClick={(event) => {
                  if (stopPropagation) event.stopPropagation();
                  goToIndex(index);
                }}
                aria-label={`Ir a foto ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex ? 'w-5 bg-white' : 'w-2.5 bg-white/45'
                }`}
              />
            ))}
          </div>
          <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
            {currentIndex + 1}/{slides.length}
          </div>
        </>
      ) : null}
    </div>
  );
}
