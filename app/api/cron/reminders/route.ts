import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStore } from "@/lib/store";
import { meetingDateTime, toDateKey } from "@/lib/meeting-utils";
import { sendFast2SMSMessage } from "@/utils/fast2sms";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  const currentDateKey = toDateKey(now);

  const meetings = getStore().meetings.filter((meeting) => meeting.date === currentDateKey && meeting.status === "scheduled");
  const upcoming = meetings.filter((meeting) => {
    const meetingTime = meetingDateTime(meeting.date, meeting.time);
    const gap = Math.round((meetingTime.getTime() - inOneHour.getTime()) / (60 * 1000));
    return gap >= -1 && gap <= 1;
  });

  const results = await Promise.all(
    upcoming.map(async (meeting) => {
      const message = `Reminder: meeting with ${meeting.clientName} at ${meeting.time} on ${meeting.date}. Location: ${meeting.mapsLink ?? meeting.businessAddress}`;
      return sendFast2SMSMessage({
        numbers: [meeting.phone],
        message,
        route: "q"
      });
    })
  );

  return NextResponse.json({ ok: true, remindersSent: results.length });
}
