import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label ? <label className="text-sm text-gray-600">{label}</label> : null}
      <input
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm"
        {...props}
      />
    </div>
  );
}
