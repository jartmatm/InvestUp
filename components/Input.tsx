type InputProps = {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  readOnly?: boolean;
};

export default function Input({
  placeholder,
  type = 'text',
  value,
  onChange,
  className,
  readOnly,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-white/25 bg-white/20 px-4 py-2.5 text-sm font-medium tracking-[-0.015em] text-gray-900 outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-gray-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md focus:border-primary/60 focus:ring-2 focus:ring-primary/20 ${className ?? ''}`}
    />
  );
}
