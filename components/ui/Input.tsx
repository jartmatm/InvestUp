import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label ? <label className="text-sm font-medium tracking-[-0.015em] text-gray-600">{label}</label> : null}
      <input
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium tracking-[-0.015em] focus:outline-none focus:ring-2 focus:ring-primary"
        {...props}
      />
    </div>
  );
}
