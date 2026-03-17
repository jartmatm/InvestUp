import React from 'react';

type ListItemProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function ListItem({ title, subtitle, rightSlot }: ListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/25 bg-white/20 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}
