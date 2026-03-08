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
      className={`w-full rounded-2xl border border-white/45 bg-white/92 p-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-white focus:bg-white ${className ?? ''}`}
    />
  );
}
