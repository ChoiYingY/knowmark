import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, addDays } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

// ─── Reminder Popover Component ───────────────────────────────────────────────

interface ReminderPopoverProps {
  reminderAt: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  variant?: "compact" | "detailed";
}

export function ReminderPopover({ reminderAt, onChange, disabled, variant = "detailed" }: ReminderPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");

  // Sync state when opening
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (reminderAt) {
        const d = new Date(reminderAt);
        setSelectedDay(d);
        let h = d.getHours();
        const m = d.getMinutes();
        const isPm = h >= 12;
        
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;

        setHour(h.toString());
        setMinute(m.toString().padStart(2, "0"));
        setAmpm(isPm ? "PM" : "AM");
      } else {
        // Defaults if fresh open
        setSelectedDay(undefined);
        setHour("9");
        setMinute("00");
        setAmpm("AM");
      }
    }
    setOpen(newOpen);
  };

  const handleSetReminder = () => {
    if (!selectedDay) return;

    const h24 = ampm === "AM"
      ? (parseInt(hour) % 12)
      : (parseInt(hour) % 12) + 12;
    const d = new Date(selectedDay);
    d.setHours(h24, parseInt(minute), 0, 0);
    
    onChange(d.getTime());
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  const handleQuickDate = (daysToAdd: number) => {
    const newDate = addDays(new Date(), daysToAdd);
    setSelectedDay(newDate);

    setHour("9");
    setMinute("00");
    setAmpm("AM");

    const h24 = ampm === "AM" ? parseInt(hour) % 12 : (parseInt(hour) % 12) + 12;
    const d = new Date(newDate);
    d.setHours(h24, parseInt(minute), 0, 0);

    onChange(d.getTime());
    setOpen(false);
  };

  const isTomorrow = (day: Date | undefined) => {
    if (!day) return false;
    return format(day, 'yyyy-MM-dd') === format(addDays(new Date(), 1), 'yyyy-MM-dd');
  };

  const isNextWeek = (day: Date | undefined) => {
    if (!day) return false;
    return format(day, 'yyyy-MM-dd') === format(addDays(new Date(), 7), 'yyyy-MM-dd');
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
          disabled={disabled}
        >
          {reminderAt ? (
            <>
              <span className="truncate">
                {
                  variant === "compact" ?
                    format(new Date(reminderAt), "MMM d, h:mm a") :
                    `Remind to read · ${format(new Date(reminderAt), "MMM d, h:mm a")}`
                }
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
              <span>{ variant === "compact" ? "Add reminder" : "Remind me" }</span>
            </>
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-80 rounded-xl bg-card shadow-lg p-4 space-y-3"
          sideOffset={8} 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Quick actions */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick reminders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleQuickDate(1)}
                className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                  isTomorrow(selectedDay) 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => handleQuickDate(7)}
                className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                  isNextWeek(selectedDay)
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                Next week
              </button>
            </div>
          </div>

          {/* Calendar */}          
          <div className="flex items-center justify-center pt-2 border-t border-border">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              disabled={{ before: new Date() }}
              showOutsideDays={false}
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                caption: "flex justify-between px-1 pt-1 relative items-center",
                caption_label: "text-sm font-semibold text-foreground",
                nav: "space-x-1 flex items-center",
                nav_button: "h-6 w-6 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center rounded hover:bg-accent",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.7rem] text-center",
                row: "flex w-full mt-1",
                cell: "h-8 w-8 text-center text-sm p-0 relative",
                day: "h-8 w-8 p-0 font-normal text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "ring-1 ring-primary/30 font-medium",
                day_outside: "opacity-30",
                day_disabled: "opacity-30 pointer-events-none",
              }}
            />
          </div>

          {/* Time Selection */}
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground mr-1">Time</span>
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3rem]"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-muted-foreground">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3rem]"
            >
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-7 min-w-[3.5rem]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>

          {/* Footer row */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={handleSetReminder}
              disabled={!selectedDay}
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Set reminder
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}