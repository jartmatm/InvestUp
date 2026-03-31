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
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">InvestApp</p>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {rightSlot ? (
        <div className={align === 'center' ? 'absolute right-0 top-0' : ''}>{rightSlot}</div>
      ) : null}
    </header>
  );
}
