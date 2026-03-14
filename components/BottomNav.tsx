'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/home', label: 'Inicio' },
  { href: '/feed', label: 'Feed' },
  { href: '/invest', label: 'Invertir' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/profile', label: 'Perfil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-xl items-center justify-around px-4 py-3">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs font-semibold transition ${
                active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
