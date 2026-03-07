type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
};

export default function Button({
  children,
  onClick,
  disabled,
  className,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-md transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
