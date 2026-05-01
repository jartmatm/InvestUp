'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SWIPE_THRESHOLD_PX = 90;
const VERTICAL_TOLERANCE_PX = 70;
const MOBILE_MAX_WIDTH_PX = 768;

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'a,button,input,textarea,select,[role="button"],[data-swipe-ignore="true"]'
    )
  );
};

const isInsideHorizontalScroller = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  let node: HTMLElement | null = target;

  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 8) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowX)) return true;
    }
    node = node.parentElement;
  }

  return false;
};

export default function MobileSwipeBack() {
  const router = useRouter();

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const shouldTrack = (event: TouchEvent) => {
      if (window.innerWidth > MOBILE_MAX_WIDTH_PX) return false;
      if (event.touches.length !== 1) return false;
      if (isInteractiveTarget(event.target)) return false;
      if (isInsideHorizontalScroller(event.target)) return false;
      return true;
    };

    const onTouchStart = (event: TouchEvent) => {
      tracking = shouldTrack(event);
      if (!tracking) return;

      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (deltaX > -SWIPE_THRESHOLD_PX || Math.abs(deltaY) > VERTICAL_TOLERANCE_PX) return;

      if (window.history.length > 1) {
        router.back();
        return;
      }

      router.push('/home');
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [router]);

  return null;
}
