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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
      <div className="mx-auto grid w-full max-w-xl grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-1 py-2 text-center text-xs font-medium transition ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
