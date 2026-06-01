import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputWrapper,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/core/combobox';

type AppComboboxOption = {
  label: string;
  value: string;
};

type AppComboboxProps = {
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  options: AppComboboxOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

export function AppCombobox({
  className,
  disabled = false,
  emptyLabel = 'No options',
  options,
  placeholder,
  value,
  onChange,
}: AppComboboxProps) {
  return (
    <Combobox
      className={className}
      items={options}
      isDisabled={disabled}
      value={value || null}
      onChange={(next) => onChange(typeof next === 'string' ? next : '')}
    >
      <ComboboxInputWrapper className="min-h-11 rounded-2xl border-[#E2E6F0] bg-white">
        <ComboboxInput
          className="min-h-11 px-4 text-sm font-semibold text-[#17203A] placeholder:text-[#9BA5B8]"
          placeholder={placeholder}
        />
        <ComboboxTrigger className="right-3 text-[#96A0B5]" />
      </ComboboxInputWrapper>

      <ComboboxContent className="rounded-2xl border-[#E2E6F0]">
        <ComboboxList>
          {(item: { value: string; label: string }) => (
            <ComboboxItem id={item.value}>{item.label}</ComboboxItem>
          )}
        </ComboboxList>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}
