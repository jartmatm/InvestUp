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
      {rightSlot}
    </header>
  );
}
