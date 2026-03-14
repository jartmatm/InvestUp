"use client";

import React from "react";

type TabOption = {
  label: string;
  value: string;
};

type TabsProps = {
  options: TabOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function Tabs({ options, value, onChange, className }: TabsProps) {
  return (
    <div className={`inline-flex rounded-xl bg-gray-100 p-1 ${className ?? ""}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
              active ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
