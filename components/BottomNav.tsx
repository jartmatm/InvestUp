'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/home', label: 'Home' },
  { href: '/feed', label: 'Feed' },
  { href: '/invest', label: 'Invest' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/profile', label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-3 pt-2">
      <div className="mx-auto grid w-full max-w-xl grid-cols-5 gap-1 rounded-2xl border border-white/35 bg-white/18 p-1.5 backdrop-blur-xl">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-1 py-2 text-center text-xs font-semibold transition ${active ? 'bg-white text-violet-700 shadow-sm' : 'text-white/85 hover:bg-white/12 hover:text-white'}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
