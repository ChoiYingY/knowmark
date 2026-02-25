import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  format,
  addDays,
  startOfDay,
  isSameDay,
  addHours,
  setHours,
  setMinutes,
  nextSaturday,
  nextMonday,
  startOfMonth,
  isSameMonth
} from "date-fns";
import { CalendarDays, X, Info } from "lucide-react";
import { useState, type MouseEvent, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Meridiem,
  buildDateFromParts, formatSlotLabel,
  isPastManualSelection, roundUpToNextHalfHour, roundUpToQuarterHour, to12HourParts
} from "@/utils/timeUtil";

interface ReminderPopoverProps {
  reminderAt: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  variant?: "compact" | "detailed";
  status?: "scheduled" | "sent" | "failed" | "canceled" | null;
}

const statusClasses: Record<"scheduled" | "sent" | "failed" | "canceled", string> = {
  scheduled:
    "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
  sent:
    "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300",
  failed:
    "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  canceled:
    "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
};

const statusTooltip: Record<"scheduled" | "sent" | "failed" | "canceled", string> = {
  scheduled: "Reminder scheduled",
  sent: "Reminder sent",
  failed: "Reminder failed",
  canceled: "Reminder canceled",
};

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
  status = null,
}: ReminderPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<Meridiem>("AM");
  const timeItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [month, setMonth] = useState<Date>(() =>
    startOfMonth(reminderAt ? new Date(reminderAt) : new Date())
  );

  useEffect(() => {
    if (!open) return;
    const slotKey = `${hour}:${minute}-${ampm}`;
    scrollTimeIntoView(slotKey);
  }, [open, selectedDay, hour, minute, ampm]);

  const isInvalidPastSelection = isPastManualSelection(
    selectedDay,
    hour,
    minute,
    ampm
  );

  const isTodaySelected = selectedDay ? isSameDay(selectedDay, new Date()) : false;

  const isSlotSelected = (slot: TimeSlot) =>
    hour === slot.hour && minute === slot.minute && ampm === slot.ampm;

  // scroll to selected time
  const scrollTimeIntoView = (slotKey: string) => {
    requestAnimationFrame(() => {
      timeItemRefs.current[slotKey]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

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
        setMonth(startOfMonth(reminderDate));
      } else {
        // New reminder: default to the next available slot within the visible range (9:00 AM–11:30 PM)
        const now = new Date();
        const rounded = roundUpToNextHalfHour(now);

        const roundedMinutes = rounded.getHours() * 60 + rounded.getMinutes();
        const firstSlotMinutes = START_MINUTES; // 9:00 AM
        const lastSlotMinutes = START_MINUTES + (TOTAL_SLOTS - 1) * SLOT_STEP; // 11:30 PM

        let nextSlot: Date;

        if (roundedMinutes < firstSlotMinutes) {
          // Before 9:00 AM -> default to today 9:00 AM
          nextSlot = new Date(now);
          nextSlot.setHours(9, 0, 0, 0);
        } else if (roundedMinutes > lastSlotMinutes) {
          // After last slot -> default to tomorrow 9:00 AM
          nextSlot = addDays(startOfDay(now), 1);
          nextSlot.setHours(9, 0, 0, 0);
        } else {
          // Within slot range -> use next rounded half-hour
          nextSlot = rounded;
        }

        setSelectedDay(startOfDay(nextSlot));

        const parts = to12HourParts(nextSlot);
        setHour(parts.hour);
        setMinute(parts.minute);
        setAmpm(parts.ampm);
        setMonth(startOfMonth(nextSlot));
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

  const handleQuickSelect = (date: Date) => {
    const normalized = roundUpToQuarterHour(date);
    setSelectedDay(startOfDay(normalized));

    const parts = to12HourParts(normalized);
    setHour(parts.hour);
    setMinute(parts.minute);
    setAmpm(parts.ampm);
    setMonth(startOfMonth(date));

    const slotKey = `${parts.hour}:${parts.minute}-${parts.ampm}`;
    scrollTimeIntoView(slotKey);
  };

  // Optional: highlight the active quick option
  const isQuickOptionActive = (date: Date) => {
    if (!selectedDay) return false;
    const selected = buildDateFromParts(selectedDay, hour, minute, ampm);
    return Math.abs(selected.getTime() - date.getTime()) < 60 * 1000; // within 1 min
  };

  const getQuickOptions = () => {
    const now = new Date();

    const tonightAt8 = setHours(setMinutes(now, 0), 20);
    const tonight = tonightAt8.getTime() <= now.getTime() ? addDays(tonightAt8, 1) : tonightAt8;

    return [
      { label: "In 1 hour", date: roundUpToQuarterHour(addHours(now, 1)) },
      { label: "Tonight (8pm)", date: tonight },
      { label: "Tomorrow (9am)", date: setHours(setMinutes(addDays(now, 1), 0), 9) },
      { label: "This weekend", date: setHours(setMinutes(nextSaturday(now), 0), 9) },
      { label: "Next week", date: setHours(setMinutes(nextMonday(now), 0), 9) },
    ];
  };

  const handleDateChange = (day: Date | undefined) => {
    if (!day) return;

    const normalized = startOfDay(day);
    setSelectedDay(normalized);
    if (!isSameMonth(normalized, month)) setMonth(startOfMonth(normalized));

    const todayStart = startOfDay(new Date());
    const isToday = normalized.toDateString() === todayStart.toDateString();

    if (isToday) {
      const now = new Date();
      const rounded = roundUpToNextHalfHour(now);

      const roundedMinutes = rounded.getHours() * 60 + rounded.getMinutes();
      const firstSlotMinutes = START_MINUTES; // 9:00 AM
      const lastSlotMinutes = START_MINUTES + (TOTAL_SLOTS - 1) * SLOT_STEP; // 11:30 PM

      // Clamp to visible slot range for today
      if (roundedMinutes < firstSlotMinutes) {
        setHour("9");
        setMinute("00");
        setAmpm("AM");
      } else if (roundedMinutes > lastSlotMinutes) {
        // No valid slots left today; keep a valid display selection at the last slot
        setHour("11");
        setMinute("30");
        setAmpm("PM");
      } else {
        const parts = to12HourParts(rounded);
        setHour(parts.hour);
        setMinute(parts.minute);
        setAmpm(parts.ampm);
      }
    } else {
      setHour("9");
      setMinute("00");
      setAmpm("AM");
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover.Trigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                status
                  ? statusClasses[status]
                  : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              disabled={disabled}
            >
              {reminderAt ? (
                <>
                  <CalendarDays size={12} />
                  <span className="truncate">
                    {variant === "compact"
                      ? format(new Date(reminderAt), "MMM d, h:mm a")
                      : `Remind to read · ${format(new Date(reminderAt), "MMM d, h:mm a")}`}
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
        </TooltipTrigger>

        {status && !disabled && (
          <TooltipContent side="top" align="center">
            {statusTooltip[status]}
          </TooltipContent>
        )}
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[400px] max-w-[calc(100vw-16px)] rounded-xl border border-border bg-card shadow-lg"
          sideOffset={8}
          align={variant === "compact" ? "end" : "start"}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-4 space-y-3">
            {/* Quick actions */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Quick select
              </p>
              <div className="flex flex-wrap gap-2">
                {getQuickOptions().map((opt) => {
                  const active = isQuickOptionActive(opt.date);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleQuickSelect(opt.date)}
                      className={cn(
                        "px-2 py-1.5 text-xs font-medium rounded-md transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
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
                  showOutsideDays={false}
                  month={month}
                  onMonthChange={setMonth}
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
                    day:"h-8 w-8 p-0 rounded-full text-sm font-normal hover:bg-accent transition-colors",
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
                    const slotKey = `${slot.hour}:${slot.minute}-${slot.ampm}`;

                    return (
                      <button
                        key={slotKey}
                        ref={(el) => {
                          timeItemRefs.current[slotKey] = el;
                        }}
                        type="button"
                        onClick={() => handleTimeSlotClick(slot)}
                        disabled={disabledSlot}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                          selected
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
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                  !selectedDay || isInvalidPastSelection
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