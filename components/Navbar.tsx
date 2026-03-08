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
        <p className="text-xs uppercase tracking-[0.2em] text-white/75">InvestUp</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle ? <p className="text-sm text-white/85">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}
