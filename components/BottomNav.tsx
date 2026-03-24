'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function IconNavHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H7C5.34315 21 4 19.7389 4 18.1833V10.9C4 10.153 4.31607 9.43656 4.87868 8.90834L10.5858 3.54999C11.3668 2.81667 12.6332 2.81667 13.4142 3.54999L19.1213 8.90834C19.6839 9.43656 20 10.153 20 10.9V18.1833C20 19.7389 18.6569 21 17 21H15M9 21V16C9 14.8954 9.89543 14 11 14H13C14.1046 14 15 14.8954 15 16V21M9 21H15" />
    </svg>
  );
}

function IconNavActivity() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 21V13H9V21M15 21H9M15 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H17C15.89543 3 15 3.89543 15 5V21ZM9 21V10C9 8.89543 8.10457 8 7 8H5C3.89543 8 3 8.89543 3 10V19C3 20.1046 3.89543 21 5 21H9Z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12V10M13 19H6.29198H5C3.89543 19 3 18.1046 3 17V10M21 10V7C21 5.89543 20.1046 5 19 5H17.708H6.29198H5C3.89543 5 3 5.89543 3 7V10M21 10H3M16 17H21M21 17L19 15M21 17L19 19" />
    </svg>
  );
}

function IconNavPayments() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 1C4.79086 1 3 2.79086 3 5V19C3 21.2091 4.79086 23 7 23H17C19.2091 23 21 21.2091 21 19V9.24264C21 8.66548 20.8752 8.10113 20.6407 7.5858C20.4442 7.15387 20.1704 6.75623 19.8284 6.41421L15.5858 2.17157C15.2438 1.82956 14.8461 1.55583 14.4142 1.35928C13.8989 1.12476 13.3345 1 12.7574 1H7ZM5 5C5 3.89543 5.89543 3 7 3H12.7574C13.0459 3 13.328 3.06235 13.5858 3.17965C13.733 3.24662 13.8721 3.33149 14 3.43287V7.00007C14 7.55236 14.4477 8.00007 15 8.00007H18.5672C18.6685 8.1279 18.7534 8.26705 18.8204 8.4142C18.9377 8.67196 19 8.95406 19 9.24264V19C19 20.1046 18.1046 21 17 21H7C5.89543 21 5 20.1046 5 19V5ZM7 5C6.44772 5 6 5.44772 6 6C6 6.55228 6.44772 7 7 7H11C11.5523 7 12 6.55228 12 6C12 5.44772 11.5523 5 11 5H7ZM7 9C6.44772 9 6 9.44772 6 10C6 10.5523 6.44772 11 7 11H12C12.5523 11 13 10.5523 13 10C13 9.44772 12.5523 9 12 9H7ZM16.25 11.5C16.25 10.9477 15.8023 10.5 15.25 10.5C14.6977 10.5 14.25 10.9477 14.25 11.5V11.6852C13.2609 12.0164 12.5 12.8286 12.5 13.8864C12.5 14.6547 12.7822 15.3357 13.4101 15.7726C13.9664 16.1596 14.6517 16.25 15.25 16.25C15.7017 16.25 15.8914 16.33 15.9476 16.3692C15.9618 16.379 15.9636 16.3824 15.968 16.392C15.9756 16.4082 16 16.4708 16 16.6136C16 16.613 16 16.613 15.9999 16.6137C15.9989 16.6204 15.9884 16.6912 15.8779 16.7835C15.7637 16.8788 15.5573 16.9773 15.25 16.9773C14.8385 16.9773 14.5976 16.8018 14.5148 16.6964C14.1735 16.2622 13.5448 16.1869 13.1106 16.5282C12.6764 16.8694 12.601 17.4981 12.9423 17.9323C13.2553 18.3306 13.7096 18.6452 14.25 18.8213V19C14.25 19.5523 14.6977 20 15.25 20C15.8023 20 16.25 19.5523 16.25 19V18.8148C17.2391 18.4836 18 17.6714 18 16.6136C18 15.8453 17.7178 15.1643 17.0899 14.7274C16.5336 14.3404 15.8483 14.25 15.25 14.25C14.7983 14.25 14.6086 14.17 14.5524 14.1308C14.5382 14.121 14.5364 14.1176 14.532 14.108C14.5244 14.0918 14.5 14.0292 14.5 13.8864C14.5 13.887 14.5 13.887 14.5001 13.8863C14.5011 13.8796 14.5116 13.8088 14.6221 13.7165C14.7363 13.6212 14.9427 13.5227 15.25 13.5227C15.6615 13.5227 15.9024 13.6982 15.9852 13.8036C16.3265 14.2378 16.9552 14.3131 17.3894 13.9718C17.8236 13.6306 17.899 13.0019 17.5577 12.5677C17.2447 12.1694 16.7904 11.8548 16.25 11.6787V11.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconNavProfile() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 14H10C7.23858 14 5 16.2386 5 19V20C5 20.5523 5.44772 21 6 21H18C18.5523 21 19 20.5523 19 20V19C19 16.2386 16.7614 14 14 14Z" />
      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" />
    </svg>
  );
}

const items = [
  { href: '/home', label: 'Home', icon: <IconNavHome /> },
  { href: '/portfolio', label: 'Activity', icon: <IconNavActivity /> },
  { href: '/feed', label: 'Payments', icon: <IconNavPayments /> },
  { href: '/profile', label: 'Profile', icon: <IconNavProfile /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  const navSlots: Array<(typeof items)[number] | null> = [items[0], items[1], null, items[2], items[3]];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-transparent">
      <div className="mx-auto w-full max-w-xl px-4 pb-3">
        <div className="relative rounded-[20px] border border-white/25 bg-white/20 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
          <Link
            href="/invest"
            aria-label="Send"
            className={`absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-[0_12px_24px_rgba(107,57,244,0.35)] ${
              pathname.startsWith('/invest') ? 'bg-[#5A27E0]' : 'bg-[#6B39F4]'
            }`}
          >
            <span className="translate-y-px">
              <IconSend />
            </span>
          </Link>
          <div className="grid grid-cols-5 items-center justify-items-center gap-1">
            {navSlots.map((item, index) => {
              if (!item) {
                return <div key={`nav-spacer-${index}`} className="h-12 w-12" aria-hidden="true" />;
              }

              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                    active ? 'text-[#6B39F4]' : 'text-gray-500 hover:text-[#5A27E0]'
                  }`}
                >
                  {item.icon}
                  <span className="sr-only">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
