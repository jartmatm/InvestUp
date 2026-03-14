import React from "react";

type ListItemProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function ListItem({ title, subtitle, rightSlot }: ListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
      </div>
      {rightSlot}
    </div>
  );
}
