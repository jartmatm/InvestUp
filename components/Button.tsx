type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  children,
  onClick,
  disabled,
  className,
  type = "button",
  variant = "primary",
}: ButtonProps) {
  const base =
    "w-full rounded-lg px-4 py-2.5 text-sm font-semibold tracking-[-0.02em] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-light",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
