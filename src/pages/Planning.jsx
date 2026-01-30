import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  getWeek,
  getYear,
  getMonth
} from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import PlanningHeader from "../components/planning/PlanningHeader";
import ShiftLegend from "../components/planning/ShiftLegend";
import PlanningTable from "../components/planning/PlanningTable";
import CopyWeekDialog from "../components/planning/CopyWeekDialog";
import CopyDayDialog from "../components/planning/CopyDayDialog";
import AIAssistant from "../components/planning/AIAssistant";
import CapacityOverview from "../components/planning/CapacityOverview";

const departments = ["Management", "Transport", "PostNL", "Charters"];

export default function Planning() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [viewMode, setViewMode] = useState("week");
  const [colorMode, setColorMode] = useState("shift");
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showCopyDayDialog, setShowCopyDayDialog] = useState(false);
  const [sourceCopyDay, setSourceCopyDay] = useState(null);
  const queryClient = useQueryClient();

  const periodStart = viewMode === "week"
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);

  const periodEnd = viewMode === "week"
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const weekNumber = getWeek(currentDate, { weekStartsOn: 1 });
  const monthNumber = getMonth(currentDate) + 1;
  const year = getYear(currentDate);

  const periodLabel = viewMode === "week" ? `Week ${weekNumber}` : format(currentDate, "MMMM yyyy", { locale: nl });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules', viewMode === "week" ? weekNumber : monthNumber, year, viewMode],
    queryFn: async () => {
      if (viewMode === "week") {
        return base44.entities.Schedule.filter({ week_number: weekNumber, year });
      } else {
        const allSchedules = await base44.entities.Schedule.filter({ year });
        const monthWeeks = [...new Set(days.map(d => getWeek(d, { weekStartsOn: 1 })))];
        return allSchedules.filter(s => monthWeeks.includes(s.week_number));
      }
    }
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => base44.entities.Holiday.filter({ year })
  });

  const { data: uurcodes = [] } = useQuery({
    queryKey: ['uurcodes'],
    queryFn: () => base44.entities.Uurcode.filter({ status: 'Actief' })
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routes'],
    queryFn: () => base44.entities.Route.filter({ is_active: true })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Schedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    }
  });

  const activeEmployees = employees.filter(e =>
    e.status === 'Actief' &&
    (filterDepartment === 'all' || e.department === filterDepartment)
  );

  const getScheduleForEmployee = (employeeId) => {
    return schedules.find(s => s.employee_id === employeeId);
  };

  const getDayKey = (index) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days[index % 7];
  };

  const handleShiftChange = (employeeId, dayIndex, value, routeId = null) => {
    const dayKey = getDayKey(dayIndex);
    const routeKey = `${dayKey}_route_id`;
    const targetWeek = getWeek(days[dayIndex], { weekStartsOn: 1 });
    const targetYear = getYear(days[dayIndex]);
    const existingSchedule = schedules.find(s => s.employee_id === employeeId && s.week_number === targetWeek && s.year === targetYear);

    const updateData = { [dayKey]: value };
    if (routeId !== null) {
      updateData[routeKey] = routeId;
    }

    if (existingSchedule) {
      updateMutation.mutate({
        id: existingSchedule.id,
        data: updateData
      });
    } else {
      const newSchedule = {
        employee_id: employeeId,
        week_number: targetWeek,
        year: targetYear,
        ...updateData
      };
      createMutation.mutate(newSchedule);
    }
  };

  const handlePreviousPeriod = () => {
    setCurrentDate(viewMode === "week" ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleNextPeriod = () => {
    setCurrentDate(viewMode === "week" ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };

  const handleCopyWeek = async (targetWeek, targetYear) => {
    try {
      const sourceSchedules = schedules.filter(s => s.week_number === weekNumber && s.year === year);
      
      for (const schedule of sourceSchedules) {
        const existingTarget = await base44.entities.Schedule.filter({
          employee_id: schedule.employee_id,
          week_number: targetWeek,
          year: targetYear
        });

        const scheduleData = {
          employee_id: schedule.employee_id,
          week_number: targetWeek,
          year: targetYear,
          monday: schedule.monday,
          tuesday: schedule.tuesday,
          wednesday: schedule.wednesday,
          thursday: schedule.thursday,
          friday: schedule.friday,
          saturday: schedule.saturday,
          sunday: schedule.sunday,
          notes: schedule.notes
        };

        if (existingTarget.length > 0) {
          await base44.entities.Schedule.update(existingTarget[0].id, scheduleData);
        } else {
          await base44.entities.Schedule.create(scheduleData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(`Planning gekopieerd naar week ${targetWeek} (${targetYear})`);
    } catch (error) {
      toast.error('Fout bij kopiëren: ' + error.message);
    }
  };

  const handleCopyDay = (sourceDay) => {
    setSourceCopyDay(sourceDay);
    setShowCopyDayDialog(true);
  };

  const handleCopyDayConfirm = async (sourceDay, targetDays) => {
    try {
      const sourceDayIndex = days.findIndex(d => d.toISOString() === sourceDay.toISOString());
      const sourceDayKey = getDayKey(sourceDayIndex);
      const sourceWeek = getWeek(sourceDay, { weekStartsOn: 1 });
      const sourceYear = getYear(sourceDay);

      for (const targetDay of targetDays) {
        const targetDayIndex = days.findIndex(d => d.toISOString() === targetDay.toISOString());
        const targetDayKey = getDayKey(targetDayIndex);
        const targetWeek = getWeek(targetDay, { weekStartsOn: 1 });
        const targetYear = getYear(targetDay);

        for (const employee of activeEmployees) {
          const sourceSchedule = schedules.find(
            s => s.employee_id === employee.id && s.week_number === sourceWeek && s.year === sourceYear
          );
          const sourceValue = sourceSchedule?.[sourceDayKey] || "";

          const targetSchedule = schedules.find(
            s => s.employee_id === employee.id && s.week_number === targetWeek && s.year === targetYear
          );

          if (targetSchedule) {
            await base44.entities.Schedule.update(targetSchedule.id, {
              [targetDayKey]: sourceValue
            });
          } else {
            await base44.entities.Schedule.create({
              employee_id: employee.id,
              week_number: targetWeek,
              year: targetYear,
              [targetDayKey]: sourceValue
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(`Dag gekopieerd naar ${targetDays.length} dag(en)`);
    } catch (error) {
      toast.error('Fout bij kopiëren: ' + error.message);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(18);
    doc.text('Planning', 14, 15);
    doc.setFontSize(10);
    doc.text(`${periodLabel} - ${format(periodStart, "d MMM", { locale: nl })} t/m ${format(periodEnd, "d MMM yyyy", { locale: nl })}`, 14, 22);

    const cellWidth = (pageWidth - 60) / days.length;
    let y = 35;

    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y, 40, 8, 'F');
    doc.text('Medewerker', 16, y + 5);

    days.forEach((day, i) => {
      const x = 54 + i * cellWidth;
      doc.rect(x, y, cellWidth, 8, 'F');
      doc.text(format(day, "EEE d MMM", { locale: nl }), x + 2, y + 5);
    });

    y += 10;

    activeEmployees.forEach((employee) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      const schedule = getScheduleForEmployee(employee.id);
      doc.setFontSize(7);
      doc.text(`${employee.first_name} ${employee.last_name}`, 16, y + 4);

      days.forEach((day, dayIndex) => {
        const dayKey = getDayKey(dayIndex);
        const value = schedule?.[dayKey] || "-";
        const x = 54 + dayIndex * cellWidth;
        doc.rect(x, y, cellWidth, 7);
        doc.text(value, x + 2, y + 4);
      });

      y += 8;
    });

    doc.save(`planning-${periodLabel.replace(/\s+/g, '-')}.pdf`);
    toast.success('PDF geëxporteerd!');
  };

  const isLoading = loadingEmployees || loadingSchedules;

  return (
    <div className="space-y-6">
      <PlanningHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentDate={currentDate}
        onPreviousPeriod={handlePreviousPeriod}
        onNextPeriod={handleNextPeriod}
        periodStart={periodStart}
        periodEnd={periodEnd}
        periodLabel={periodLabel}
        filterDepartment={filterDepartment}
        setFilterDepartment={setFilterDepartment}
        departments={departments}
        colorMode={colorMode}
        setColorMode={setColorMode}
        onExportPDF={handleExportPDF}
        onCopyWeek={() => setShowCopyDialog(true)}
      />

      <AIAssistant />

      <CapacityOverview
        days={days}
        employees={activeEmployees}
        schedules={schedules}
        onCopyDay={handleCopyDay}
      />

      <ShiftLegend />

      <Card>
        <CardContent className="p-0">
          <PlanningTable
            isLoading={isLoading}
            employees={activeEmployees}
            days={days}
            schedules={schedules}
            holidays={holidays}
            colorMode={colorMode}
            onShiftChange={handleShiftChange}
            getDayKey={getDayKey}
            getScheduleForEmployee={getScheduleForEmployee}
            onCopyDay={handleCopyDay}
            uurcodes={uurcodes}
            routes={routes}
          />
        </CardContent>
      </Card>

      <CopyWeekDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        currentWeek={weekNumber}
        currentYear={year}
        onCopy={handleCopyWeek}
      />

      <CopyDayDialog
        open={showCopyDayDialog}
        onOpenChange={setShowCopyDayDialog}
        sourceDay={sourceCopyDay}
        availableDays={days}
        onCopy={handleCopyDayConfirm}
      />
    </div>
  );
}