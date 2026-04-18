'use client';

type NavbarProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  align?: 'left' | 'center';
};

export default function Navbar({ title, subtitle, rightSlot, align = 'left' }: NavbarProps) {
  return (
    <header
      className={`relative mb-5 flex items-start ${
        align === 'center' ? 'justify-center text-center' : 'justify-between'
      }`}
    >
      <div className={align === 'center' ? 'mx-auto text-center' : ''}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
          InvestApp
        </p>
        <h1 className="text-[1.95rem] font-semibold tracking-[-0.045em] text-gray-900">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-[34rem] text-sm leading-6 tracking-[-0.015em] text-gray-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {rightSlot ? (
        <div className={align === 'center' ? 'absolute right-0 top-0' : ''}>{rightSlot}</div>
      ) : null}
    </header>
  );
}
