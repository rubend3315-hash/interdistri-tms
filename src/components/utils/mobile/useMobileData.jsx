import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, getWeek, getYear } from "date-fns";

/**
 * Paginated fetch helper — SDK bug workaround.
 * SDK .filter()/.list() returns corrupted string for >~40 records.
 * This fetches in batches of 20 to guarantee valid arrays.
 */
async function paginatedFilter(entity, query = {}, sort = '-created_date') {
  const all = [];
  let skip = 0;
  const PAGE = 20;
  while (true) {
    const page = await entity.filter(query, sort, PAGE, skip);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}

/**
 * useMobileData — Central data fetching hook for mobile entry pages.
 * Zero entity calls in pages/components — all queries live here.
 */
export function useMobileData(user, selectedDate) {
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', user?.email],
    queryFn: () => base44.entities.Employee.filter({ email: user?.email }),
    enabled: !!user?.email
  });

  const currentEmployee = employees[0] ?? null;

  const { data: vehicles = [] } = useQuery({
    queryKey: ['activeVehicles'],
    queryFn: () => paginatedFilter(base44.entities.Vehicle, { status: 'Beschikbaar' })
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['activeCustomers'],
    queryFn: () => paginatedFilter(base44.entities.Customer, { status: 'Actief' })
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['activeProjectsMobile'],
    queryFn: () => paginatedFilter(base44.entities.Project, { status: 'Actief' })
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routesMobile'],
    queryFn: () => paginatedFilter(base44.entities.Route, { is_active: true })
  });

  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['tiModelRoutesMobile'],
    queryFn: () => paginatedFilter(base44.entities.TIModelRoute, { is_active: true })
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ['activiteiten'],
    queryFn: () => paginatedFilter(base44.entities.Activiteit, {})
  });

  const { data: supervisorMessages = [] } = useQuery({
    queryKey: ['supervisorMessages'],
    queryFn: () => base44.entities.SupervisorMessage.filter({ is_active: true })
  });

  const { data: myTimeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => paginatedFilter(base44.entities.TimeEntry, { created_by: user?.email }),
    enabled: !!user?.email
  });

  // Also fetch entries created by admin for this employee (employee_id based)
  const { data: employeeTimeEntries = [], isLoading: loadingEmployeeEntries } = useQuery({
    queryKey: ['employeeTimeEntries', currentEmployee?.id],
    queryFn: () => paginatedFilter(base44.entities.TimeEntry, { employee_id: currentEmployee.id }),
    enabled: !!currentEmployee?.id
  });

  const { data: myMessages = [] } = useQuery({
    queryKey: ['myMessages', currentEmployee?.id],
    queryFn: () => base44.entities.Message.filter({ to_employee_id: currentEmployee?.id }),
    enabled: !!currentEmployee?.id
  });

  const unreadCount = myMessages.filter(m => !m.is_read).length;

  const { data: shiftTimes = [] } = useQuery({
    queryKey: ['shiftTimes', currentEmployee?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const shiftDept = currentEmployee?.mobile_shift_department || currentEmployee?.department;
      if (!shiftDept) return [];
      const now = new Date();
      const targetDate = now.getHours() >= 12
        ? format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), 'yyyy-MM-dd')
        : format(now, 'yyyy-MM-dd');
      const shifts = await base44.entities.ShiftTime.filter({ department: shiftDept, date: targetDate });
      shifts.sort((a, b) => a.service_start_time.localeCompare(b.service_start_time));
      return shifts.slice(0, 1);
    },
    enabled: !!currentEmployee?.department,
    staleTime: 5 * 60 * 1000
  });

  const todayShift = shiftTimes[0];

  const { data: schedules = [] } = useQuery({
    queryKey: ['mySchedules', currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      const today = new Date();
      return base44.entities.Schedule.filter({
        employee_id: currentEmployee.id,
        week_number: getWeek(today, { weekStartsOn: 1 }),
        year: getYear(today)
      });
    },
    enabled: !!currentEmployee?.id
  });

  // Subscribe to schedule updates
  useEffect(() => {
    if (!currentEmployee?.id) return;
    const unsubscribe = base44.entities.Schedule.subscribe((event) => {
      if (event.data?.employee_id === currentEmployee.id) {
        queryClient.invalidateQueries({ queryKey: ['mySchedules'] });
      }
    });
    return unsubscribe;
  }, [currentEmployee?.id, queryClient]);

  const welcomeMessage = supervisorMessages.find(m =>
    (!m.target_employee_id || m.target_employee_id === currentEmployee?.id) &&
    (!m.department || m.department === 'Alle' || m.department === currentEmployee?.department)
  );

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  // Use selectedDate for filtering submitted entries (falls back to today)
  const activeDate = selectedDate || todayStr;

  // Merge myTimeEntries + employeeTimeEntries, deduplicate by id
  const allMyEntries = useMemo(() => {
    const map = new Map();
    for (const e of myTimeEntries) map.set(e.id, e);
    for (const e of employeeTimeEntries) map.set(e.id, e);
    return Array.from(map.values());
  }, [myTimeEntries, employeeTimeEntries]);

  const submittedTodayEntries = useMemo(() => {
    if (!currentEmployee?.id || !allMyEntries.length) return [];
    return allMyEntries.filter(e =>
      e.employee_id === currentEmployee.id &&
      e.date === activeDate &&
      (e.status === 'Ingediend' || e.status === 'Goedgekeurd') &&
      e.signature_url
    );
  }, [allMyEntries, currentEmployee?.id, activeDate]);

  const approvedEntries = useMemo(() =>
    allMyEntries.filter(e => e.status === 'Goedgekeurd'),
  [allMyEntries]);

  // Mark message as read
  const markMessageRead = async (messageId) => {
    await base44.entities.Message.update(messageId, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ['myMessages'] });
  };

  return {
    user, currentEmployee,
    vehicles, customers, projects, routes, tiModelRoutes, activiteiten,
    myTimeEntries: allMyEntries, loadingEntries: loadingEntries || loadingEmployeeEntries, approvedEntries,
    myMessages, unreadCount, markMessageRead,
    todayShift, schedules, welcomeMessage,
    submittedTodayEntries, todayStr,
    queryClient,
  };
}