export type Meridiem = "AM" | "PM";

export function formatSlotLabel(hour24: number, minute: number) {
  const isPm = hour24 >= 12;
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = String(minute).padStart(2, "0");
  return `${String(h12).padStart(2, "0")}:${mm} ${isPm ? "PM" : "AM"}`;
}

export function to12HourParts(date: Date): {
  hour: string;
  minute: string;
  ampm: Meridiem;
} {
  const rawHours = date.getHours();
  const minutes = date.getMinutes();
  const ampm: Meridiem = rawHours >= 12 ? "PM" : "AM";

  let displayHour = rawHours % 12;
  if (displayHour === 0) displayHour = 12;

  return {
    hour: String(displayHour),
    minute: String(minutes).padStart(2, "0"),
    ampm,
  };
}

// Round to the next available 30-min slot so it matches TIME_SLOTS
export function roundUpToNextHalfHour(now: Date): Date {
  const d = new Date(now);
  d.setSeconds(0, 0);

  const minutes = d.getMinutes();
  const remainder = minutes % 30;
  const add = remainder === 0 ? 30 : 30 - remainder;

  d.setMinutes(minutes + add);
  return d;
}

export function buildDateFromParts(
  day: Date,
  hour: string,
  minute: string,
  ampm: Meridiem
): Date {
  const h = Number.parseInt(hour, 10);
  const m = Number.parseInt(minute, 10);

  const h24 = ampm === "AM" ? h % 12 : (h % 12) + 12;

  const d = new Date(day);
  d.setHours(h24, m, 0, 0);
  return d;
}

export function isPastManualSelection(
  day: Date | undefined,
  hour: string,
  minute: string,
  ampm: Meridiem
): boolean {
  if (!day) return false;
  const selected = buildDateFromParts(day, hour, minute, ampm);
  return selected.getTime() < Date.now();
}

export function formatReminderTime(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}