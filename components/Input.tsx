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
  type = "text",
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
      className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30 ${className ?? ""}`}
    />
  );
}
