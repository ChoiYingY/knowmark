import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { CalendarDays, X, Info } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  Meridiem,
  buildDateFromParts, formatSlotLabel,
  isPastManualSelection, roundUpToNextHalfHour, to12HourParts
} from "@/utils/timeUtil";

interface ReminderPopoverProps {
  reminderAt: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  variant?: "compact" | "detailed";
}

type TimeSlot = {
  hour: string;
  minute: string;
  ampm: Meridiem;
  label: string;
};

// 30-min slots (fewer options, less overwhelming)
const START_MINUTES = 9 * 60; // 9:00 AM
const SLOT_STEP = 30;
const TOTAL_SLOTS = (24 * 60 - START_MINUTES) / SLOT_STEP; // from 9:00 AM to 11:30 PM

const TIME_SLOTS: TimeSlot[] = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
  const totalMinutes = START_MINUTES + i * SLOT_STEP;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const isPm = hour24 >= 12;
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;

  return {
    hour: String(h12),
    minute: String(minute).padStart(2, "0"),
    ampm: isPm ? "PM" : "AM",
    label: formatSlotLabel(hour24, minute),
  };
});

export function ReminderPopover({
  reminderAt,
  onChange,
  disabled,
  variant = "detailed",
}: ReminderPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<Meridiem>("AM");

  const isInvalidPastSelection = isPastManualSelection(
    selectedDay,
    hour,
    minute,
    ampm
  );

  const isTodaySelected = selectedDay ? isSameDay(selectedDay, new Date()) : false;

  const isSlotSelected = (slot: TimeSlot) =>
    hour === slot.hour && minute === slot.minute && ampm === slot.ampm;

  // moved ABOVE visibleTimeSlots usage (fixes runtime error)
  const isSlotInPast = (slot: TimeSlot) => {
    if (!selectedDay || !isTodaySelected) return false;
    const d = buildDateFromParts(selectedDay, slot.hour, slot.minute, slot.ampm);
    return d.getTime() < Date.now();
  };

  const visibleTimeSlots = TIME_SLOTS.filter((slot) => !isSlotInPast(slot));

  const handleTimeSlotClick = (slot: TimeSlot) => {
    if (isSlotInPast(slot)) return;
    setHour(slot.hour);
    setMinute(slot.minute);
    setAmpm(slot.ampm);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (reminderAt) {
        // Existing reminder: open with that exact date/time selected
        const reminderDate = new Date(reminderAt);
        setSelectedDay(startOfDay(reminderDate));

        const parts = to12HourParts(reminderDate);
        setHour(parts.hour);
        setMinute(parts.minute);
        setAmpm(parts.ampm);
      } else {
        // New reminder: default to today + next available 30-min slot
        const nextSlot = roundUpToNextHalfHour(new Date());

        setSelectedDay(startOfDay(nextSlot));

        const parts = to12HourParts(nextSlot);
        setHour(parts.hour);
        setMinute(parts.minute);
        setAmpm(parts.ampm);
      }
    }

    setOpen(newOpen);
  };

  const handleSetReminder = () => {
    if (!selectedDay) return;

    const selected = buildDateFromParts(selectedDay, hour, minute, ampm);

    if (selected.getTime() < Date.now()) {
      toast.error("That time has already passed. Please pick a later time.", {
        id: "invalid-reminder-time",
      });
      return;
    }

    onChange(selected.getTime());
    setOpen(false);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  const handleQuickDate = (daysToAdd: number) => {
    // Immediate set: Tomorrow / Next week at 9:00 AM
    const base = addDays(new Date(), daysToAdd);
    const d = startOfDay(base);
    d.setHours(9, 0, 0, 0);

    setSelectedDay(startOfDay(d));
    setHour("9");
    setMinute("00");
    setAmpm("AM");

    onChange(d.getTime());
    setOpen(false);
  };

  const isTomorrow = (day: Date | undefined) =>
    !!day && isSameDay(day, addDays(new Date(), 1));

  const isNextWeek = (day: Date | undefined) =>
    !!day && isSameDay(day, addDays(new Date(), 7));

  const handleDateChange = (day: Date | undefined) => {
    if (!day) return;

    const normalized = startOfDay(day);
    setSelectedDay(normalized);

    const isToday = normalized.toDateString() === startOfDay(new Date()).toDateString();

    if (isToday) {
      const nextSlot = roundUpToNextHalfHour(new Date());
      const parts = to12HourParts(nextSlot);

      setHour(parts.hour);
      setMinute(parts.minute);
      setAmpm(parts.ampm);
    } else {
      setHour("9");
      setMinute("00");
      setAmpm("AM");
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
        >
          {reminderAt ? (
            <>
              <CalendarDays size={12} />
              <span className="truncate">
                {variant === "compact"
                  ? format(new Date(reminderAt), "MMM d, h:mm a")
                  : `Remind to read · ${format(
                    new Date(reminderAt),
                    "MMM d, h:mm a"
                  )}`}
              </span>
              <div
                role="button"
                onClick={handleClear}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background/50"
              >
                <X size={10} />
              </div>
            </>
          ) : (
            <>
              <CalendarDays size={12} />
              <span>{variant === "compact" ? "Add reminder" : "Remind me"}</span>
            </>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[430px] max-w-[calc(100vw-16px)] rounded-xl border border-border bg-card shadow-lg"
          sideOffset={8}
          align={variant === "compact" ? "end" : "start"}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-4 space-y-3">
            {/* Quick actions */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick reminders
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDate(1)}
                  className={`px-3 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${isTomorrow(selectedDay)
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDate(7)}
                  className={`px-3 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${isNextWeek(selectedDay)
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                >
                  Next week
                </button>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Calendar + Time Rail */}
            <div className="grid grid-cols-[1fr_112px] rounded-lg overflow-hidden">
              {/* Calendar side */}
              <div className="pr-2">
                <DayPicker
                  mode="single"
                  selected={selectedDay}
                  onSelect={handleDateChange}
                  disabled={{ before: startOfDay(new Date()) }}
                  showOutsideDays={true}
                  defaultMonth={selectedDay ?? new Date()}
                  classNames={{
                    months: "flex flex-col",
                    month: "space-y-2",
                    caption: "flex items-center justify-between px-1 pt-1 relative",
                    caption_label: "text-sm font-semibold text-muted-foreground",
                    nav: "flex items-center gap-1",
                    nav_button:
                      "h-5 w-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors",
                    nav_button_previous: "absolute right-8",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse",
                    head_cell: "w-8 h-7 text-[11px] font-medium text-muted-foreground text-center",
                    day: "h-8 w-8 p-0 rounded-full text-sm font-normal hover:bg-accent transition-colors",
                    day_selected:
                      "!bg-black !text-white rounded-full hover:!bg-black focus:!bg-black active:!bg-black active:!ring-bg-lback",
                    day_today: "rounded-full ring-1 ring-primary/30 font-medium aria-selected:!text-white aria-selected:!bg-black",
                    day_outside: "text-muted-foreground/35",
                    day_disabled: "text-muted-foreground/35 pointer-events-none",
                  }}
                />
              </div>

              {/* Time rail side */}
              <div className="border-l border-border bg-muted/20">
                <div className="h-8 px-2 flex items-center border-b border-border">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Time
                  </span>
                </div>

                <div className="h-[220px] overflow-y-auto py-1">
                  {visibleTimeSlots.map((slot) => {
                    const selected = isSlotSelected(slot);
                    const disabledSlot = isSlotInPast(slot);

                    return (
                      <button
                        key={`${slot.hour}:${slot.minute}-${slot.ampm}`}
                        type="button"
                        onClick={() => handleTimeSlotClick(slot)}
                        disabled={disabledSlot}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${selected
                            ? "bg-accent text-accent-foreground font-medium"
                            : disabledSlot
                              ? "text-muted-foreground/40 cursor-not-allowed"
                              : "text-foreground hover:bg-accent/60"
                          }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}

                  {visibleTimeSlots.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-muted-foreground">
                      No times left today
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inline validation hint */}
            {isInvalidPastSelection && (
              <p className="flex items-start justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-[1px] h-3 w-3 shrink-0" />
                <span className="text-center">
                  That time has already passed today.
                  <br />
                  Please choose a later time.
                </span>
              </p>
            )}

            <div className="border-t border-border" />

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={handleSetReminder}
                disabled={!selectedDay || isInvalidPastSelection}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${!selectedDay || isInvalidPastSelection
                    ? "bg-primary text-primary-foreground opacity-50 pointer-events-none"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
              >
                Set reminder
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}