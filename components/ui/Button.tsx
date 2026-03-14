import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const base =
    "px-4 py-2 rounded-lg font-medium transition active:scale-[0.98] text-sm";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-light",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  const classes = [base, variants[variant], className].filter(Boolean).join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
