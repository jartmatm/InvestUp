'use client';

type NavbarProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export default function Navbar({ title, subtitle, rightSlot }: NavbarProps) {
  return (
    <header className="mb-5 flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">InvestUp</p>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}
