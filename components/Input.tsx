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
      className={`w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 ${className ?? ''}`}
    />
  );
}
