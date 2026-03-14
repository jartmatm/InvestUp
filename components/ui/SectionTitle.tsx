import React from "react";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({ title, subtitle }: SectionTitleProps) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
    </div>
  );
}
