import { cn } from "@/utils/cn";
import { Calendar, ChevronLeft, ChevronRight } from "@tailgrids/icons";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfDay,
  startOfWeek,
  subMonths
} from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "../button";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

type PropsType = {
  value?: Date | null;
  onChange?: (date: Date) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
};

export function DatePicker({
  value = null,
  onChange,
  placeholder = "Select date",
  className = "",
  minDate
}: PropsType) {
  const [currentMonth, setCurrentMonth] = useState<Date>(value || new Date());
  const [tempSelected, setTempSelected] = useState<Date | null>(value);
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value;

  const togglePicker = () => {
    setTempSelected(selectedDate);
    if (selectedDate) setCurrentMonth(selectedDate);
    setIsOpen(prev => !prev);
  };

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const handleCancel = () => {
    setTempSelected(selectedDate);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempSelected) {
      onChange?.(tempSelected);
    }
    setIsOpen(false);
  };

  const minSelectableDate = minDate ? startOfDay(minDate) : null;

  const isDateDisabled = (day: Date) =>
    Boolean(minSelectableDate && isBefore(startOfDay(day), minSelectableDate));

  const handleDateClick = (day: Date) => {
    if (isDateDisabled(day)) return;
    setTempSelected(day);
  };

  // Generate days grid for current month
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedDateText = selectedDate
    ? format(selectedDate, "MMMM dd, yyyy")
    : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className={`relative w-full ${className}`}>
        <PopoverTrigger asChild>
          <Button
            appearance="outline"
            type="button"
            onClick={togglePicker}
            className="min-h-12 w-full justify-start rounded-2xl border border-[#DCE6F1] bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:border-[#B8C7DA] focus:ring-[#6B39F4]/15"
          >
            <Calendar className="h-5 w-5 text-[#6B39F4]" />

            <span className="text-sm font-semibold text-[#0B1325]">
              {selectedDateText}
            </span>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-[#DCE6F1] bg-white p-0 shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:w-full">
          <div className="p-3 sm:p-5">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                iconOnly
                onClick={handlePrevMonth}
                className="text-[#667085] hover:bg-[#F3F6FA] hover:text-[#0B1325]"
              >
                <ChevronLeft />
              </Button>

              <h2 className="text-lg font-semibold text-[#0B1325]">
                {format(currentMonth, "MMMM yyyy")}
              </h2>

              <Button
                variant="ghost"
                iconOnly
                onClick={handleNextMonth}
                className="text-[#667085] hover:bg-[#F3F6FA] hover:text-[#0B1325]"
              >
                <ChevronRight />
              </Button>
            </div>

            {/* Week Days */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center sm:gap-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                <span
                  key={d}
                  className="py-2 text-sm font-semibold text-[#7A8798]"
                >
                  {d}
                </span>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 text-center sm:gap-2">
              {days.map(day => {
                const inMonth = isSameMonth(day, currentMonth);
                const selected = tempSelected && isSameDay(day, tempSelected);
                const today = isToday(day);
                const disabled = !inMonth || isDateDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    disabled={disabled}
                    onClick={() => inMonth && handleDateClick(day)}
                    className={cn(
                      "size-9 rounded-full text-sm font-medium transition-all sm:size-11",
                      {
                        "cursor-not-allowed text-[#CBD5E1]": disabled,
                        "bg-[#6B39F4] text-white shadow-[0_10px_24px_rgba(107,57,244,0.28)]":
                          selected,
                        "bg-[#F2EEFF] text-[#4D20D8]":
                          today && !selected && !disabled,
                        "text-[#0B1325] hover:bg-[#F4F6FA]":
                          inMonth && !selected && !today && !disabled
                      }
                    )}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 border-t border-[#E4ECF6] p-4">
            <Button
              onClick={handleCancel}
              appearance="outline"
              className="flex-1 rounded-2xl border-[#DCE6F1] bg-white text-[#0B1325] hover:bg-[#F8FAFD]"
            >
              Cancel
            </Button>

            <Button
              onClick={handleApply}
              className="flex-1 rounded-2xl bg-[#6B39F4] text-white hover:bg-[#5A2FCE]"
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
