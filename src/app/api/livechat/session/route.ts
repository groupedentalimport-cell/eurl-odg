import { NextResponse } from "next/server";

// ============================================================
// GET /api/livechat/session
// (Task BONUS-2-3)
//
// Public endpoint. Returns the live-chat "session" — which in this
// simpler version is just the business-hours status computed
// SERVER-SIDE (more reliable than trusting the visitor's device
// clock/timezone).
//
// Response:
//   {
//     online: boolean,
//     now: string (ISO),
//     day: 0..6 (0=Sunday),
//     hour: number (Algiers local hour, decimal),
//     businessHours: { days: [0,1,2,3,4], start: "08:00", end: "16:30" }
//   }
//
// No DB, no auth. Cached for 60s at the CDN edge.
//
// The widget uses this to display the green "En ligne" dot or the
// grey "Hors ligne" badge without relying on the visitor's clock.
// ============================================================

// Algeria = UTC+1 (no DST). Sunday=0 .. Thursday=4 → business days.
const BUSINESS_DAYS = [0, 1, 2, 3, 4]; // Sun–Thu
const START_HOUR = 8; // 08:00
const END_HOUR = 16; // 16:30 → 16.5

function computeStatus(now: Date) {
  // Shift UTC by +1 to get Algiers local time.
  const algiers = new Date(now.getTime() + 60 * 60 * 1000);
  const day = algiers.getUTCDay();
  const hour = algiers.getUTCHours();
  const minute = algiers.getUTCMinutes();
  const decimalHour = hour + minute / 60;
  const online =
    BUSINESS_DAYS.includes(day) &&
    decimalHour >= START_HOUR &&
    decimalHour < END_HOUR + 0.5; // 16.5 = 16:30
  return { online, day, hour: decimalHour };
}

export async function GET() {
  const now = new Date();
  const { online, day, hour } = computeStatus(now);
  return NextResponse.json(
    {
      online,
      now: now.toISOString(),
      day,
      hour,
      businessHours: {
        days: BUSINESS_DAYS,
        start: "08:00",
        end: "16:30",
        timezone: "Africa/Algiers (UTC+1)",
      },
    },
    {
      headers: {
        // Cache 60s at the CDN/edge — keeps the status fresh enough
        // without hammering the server.
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
