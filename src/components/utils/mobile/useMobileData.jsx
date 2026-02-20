import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { format, getWeek, getYear } from "date-fns";

/**
 * useMobileData — Central data fetching hook for mobile entry pages.
 * Zero entity calls in pages/components — all queries live here.
 */
export function useMobileData(employee) {
  const queryClient = useQueryClient();

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const currentEmployee = employee;

  const { data: vehicles = [] } = useQuery({
    queryKey: ['activeVehicles'],
    queryFn: () => base44.entities.Vehicle.filter({ status: 'Beschikbaar' }),
    enabled: !!currentEmployee?.id
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['activeCustomers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'Actief' }),
    enabled: !!currentEmployee?.id
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['activeProjectsMobile'],
    queryFn: () => base44.entities.Project.filter({ status: 'Actief' }),
    enabled: !!currentEmployee?.id
  });

  const { data: routes = [] } = useQuery({
    queryKey: ['routesMobile'],
    queryFn: () => base44.entities.Route.filter({ is_active: true }),
    enabled: !!currentEmployee?.id
  });

  const { data: tiModelRoutes = [] } = useQuery({
    queryKey: ['tiModelRoutesMobile'],
    queryFn: () => base44.entities.TIModelRoute.filter({ is_active: true }),
    enabled: !!currentEmployee?.id
  });

  const { data: activiteiten = [] } = useQuery({
    queryKey: ['activiteiten'],
    queryFn: () => base44.entities.Activiteit.list(),
    enabled: !!currentEmployee?.id
  });

  const { data: supervisorMessages = [] } = useQuery({
    queryKey: ['supervisorMessages'],
    queryFn: () => base44.entities.SupervisorMessage.filter({ is_active: true }),
    enabled: !!currentEmployee?.id
  });

  const { data: myTimeEntries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ created_by: user?.email }),
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

  const submittedTodayEntries = useMemo(() => {
    if (!currentEmployee?.id || !myTimeEntries.length) return [];
    return myTimeEntries.filter(e =>
      e.employee_id === currentEmployee.id &&
      e.date === todayStr &&
      (e.status === 'Ingediend' || e.status === 'Goedgekeurd') &&
      e.signature_url
    );
  }, [myTimeEntries, currentEmployee?.id, todayStr]);

  const approvedEntries = useMemo(() =>
    myTimeEntries.filter(e => e.status === 'Goedgekeurd'),
  [myTimeEntries]);

  // Mark message as read
  const markMessageRead = async (messageId) => {
    await base44.entities.Message.update(messageId, { is_read: true });
    queryClient.invalidateQueries({ queryKey: ['myMessages'] });
  };

  return {
    user, loadingUser, currentEmployee,
    vehicles, customers, projects, routes, tiModelRoutes, activiteiten,
    myTimeEntries, loadingEntries, approvedEntries,
    myMessages, unreadCount, markMessageRead,
    todayShift, schedules, welcomeMessage,
    submittedTodayEntries, todayStr,
    queryClient,
  };
}