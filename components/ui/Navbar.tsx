import React from "react";

type NavbarProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function Navbar({ title, subtitle, rightSlot }: NavbarProps) {
  return (
    <header className="mb-5 flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">InvestApp</p>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </header>
  );
}
