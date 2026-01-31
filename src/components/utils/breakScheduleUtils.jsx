import { base44 } from "@/api/base44Client";

export async function getBreakMinutesForHours(totalHours) {
  const breakSchedules = await base44.entities.BreakSchedule.list();
  
  const activeSchedules = breakSchedules.filter(s => s.status === 'Actief');
  
  const applicableSchedule = activeSchedules.find(schedule => {
    const meetsMinimum = totalHours >= schedule.min_hours;
    const meetsMaximum = schedule.max_hours === null || totalHours <= schedule.max_hours;
    return meetsMinimum && meetsMaximum;
  });
  
  return applicableSchedule ? applicableSchedule.break_minutes : 0;
}