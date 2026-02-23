import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, addDays } from "date-fns";
import { Bell, X } from "lucide-react";
import { useState } from "react";

// ─── Reminder Popover Component ───────────────────────────────────────────────

interface ReminderPopoverProps {
  reminderAt: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}

export default function ReminderPopover({ reminderAt, onChange, disabled }: ReminderPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();
  const [hour, setHour] = useState("9");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");

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
    setSelectedDay(addDays(new Date(), daysToAdd));
    setHour("9");
    setMinute("00");
    setAmpm("AM");
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
              <span>{format(new Date(reminderAt), "MMM d, h:mm a")}</span>
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
              <Bell size={12} />
              <span>Remind me</span>
            </>
          )}
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-72 rounded-lg border border-border bg-card shadow-lg p-3 space-y-3" 
          sideOffset={8} 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Quick actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickDate(1)}
              className="flex-1 text-xs px-2 py-1.5 rounded border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              Tomorrow
            </button>
            <button
              onClick={() => handleQuickDate(7)}
              className="flex-1 text-xs px-2 py-1.5 rounded border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              Next week
            </button>
          </div>

          {/* Calendar */}
          <div className="border border-border rounded-md p-2 bg-background/50 flex justify-center">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              disabled={{ before: new Date() }}
              showOutsideDays={false}
            />
          </div>

          {/* Time Selection */}
          <div className="flex items-center gap-2 justify-center">
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-8"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-muted-foreground">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-8"
            >
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={ampm}
              onChange={(e) => setAmpm(e.target.value)}
              className="text-xs border border-border rounded px-1 py-0.5 bg-background h-8"
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