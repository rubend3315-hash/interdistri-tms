import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  User,
  Calendar,
  Truck,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Mail,
  Check,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";

const qOpts = { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false };

export default function MissingEntriesTab({ employees = [] }) {
  const [daysBack, setDaysBack] = useState(7);
  const [search, setSearch] = useState("");
  const [expandedEmployees, setExpandedEmployees] = useState(new Set());
  const [sendingMail, setSendingMail] = useState(null); // employeeId currently sending
  const [sentMails, setSentMails] = useState(new Set()); // employeeIds already sent

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const empMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => { m[e.id] = e; });
    return m;
  }, [employees]);

  const sendReminder = async (item, e) => {
    e.stopPropagation();
    const emp = empMap[item.employeeId];
    if (!emp?.email) {
      toast.error("Geen e-mailadres bekend voor deze medewerker.");
      return;
    }
    setSendingMail(item.employeeId);
    const datesStr = item.dates.map(d => format(new Date(d.date), "EEEE d MMMM", { locale: nl })).join(", ");
    const subject = `Herinnering: ${item.missingDays} ${item.missingDays === 1 ? "dag" : "dagen"} niet ingevuld`;
    const body = `<p>Beste ${emp.first_name || item.employeeName},</p>
<p>Volgens onze GPS-registratie heb je op de volgende ${item.missingDays === 1 ? "dag" : "dagen"} gereden maar nog geen tijdregistratie ingediend:</p>
<p><strong>${datesStr}</strong></p>
<p>Wil je dit zo snel mogelijk invullen via de mobiele app?</p>
<p>Met vriendelijke groet,<br/>Interdistri TMS</p>`;
    try {
      // Send to employee
      await base44.integrations.Core.SendEmail({
        to: emp.email,
        subject,
        body,
        from_name: "Interdistri TMS",
      });
      // Send copy to admin
      await base44.integrations.Core.SendEmail({
        to: "ruben@interdistri.nl",
        subject: `[Kopie] ${subject} — ${item.employeeName}`,
        body,
        from_name: "Interdistri TMS",
      });
      setSentMails(prev => new Set(prev).add(item.employeeId));
      toast.success(`Herinnering verstuurd naar ${emp.first_name || item.employeeName} (+ kopie)`);
    } catch (err) {
      toast.error("Fout bij versturen: " + (err.message || "onbekend"));
    } finally {
      setSendingMail(null);
    }
  };

  const dateFrom = format(subDays(new Date(), daysBack), "yyyy-MM-dd");
  const dateTo = format(new Date(), "yyyy-MM-dd"); // include today

  // Fetch TripRecordLinks for the period (driver → GPS ride associations)
  const { data: tripLinks = [], isLoading: loadingLinks, refetch: refetchLinks } = useQuery({
    queryKey: ["missingEntries-links", dateFrom, dateTo],
    queryFn: () =>
      base44.entities.TripRecordLink.filter({
        date: { $gte: dateFrom, $lte: dateTo },
      }),
    ...qOpts,
    staleTime: 0, // Always refetch on mount/refetch to ensure fresh data
  });

  // Fetch TripRecords for km/hours data
  const linkRecordIds = useMemo(() => {
    const ids = new Set();
    tripLinks.forEach((l) => { if (l.trip_record_id) ids.add(l.trip_record_id); });
    return Array.from(ids);
  }, [tripLinks]);

  const { data: tripRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["missingEntries-records", linkRecordIds],
    queryFn: () => {
      if (linkRecordIds.length === 0) return [];
      // Fetch in batches of 50 IDs
      const batches = [];
      for (let i = 0; i < linkRecordIds.length; i += 50) {
        batches.push(linkRecordIds.slice(i, i + 50));
      }
      return Promise.all(
        batches.map((batch) =>
          base44.entities.TripRecord.filter({ id: { $in: batch } })
        )
      ).then((results) => results.flat());
    },
    enabled: linkRecordIds.length > 0,
    ...qOpts,
    staleTime: 0,
  });

  const tripRecordMap = useMemo(() => {
    const m = {};
    tripRecords.forEach((r) => { m[r.id] = r; });
    return m;
  }, [tripRecords]);

  // Fetch TimeEntries for the period to check who HAS submitted
  const { data: timeEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ["missingEntries-timeentries", dateFrom, dateTo],
    queryFn: () =>
      base44.entities.TimeEntry.filter({
        date: { $gte: dateFrom, $lte: dateTo },
      }),
    ...qOpts,
    staleTime: 0,
  });

  // Build set of employee_id + date that have a SUBMITTED TimeEntry (not Concept/draft)
  // Also include end_date for overnight shifts (e.g. TimeEntry date=24, end_date=25 covers both days)
  const submittedSet = useMemo(() => {
    const s = new Set();
    timeEntries.forEach((te) => {
      if (te.employee_id && te.date && te.status !== "Concept") {
        s.add(`${te.employee_id}_${te.date}`);
        // Night shifts: end_date covers the next calendar day
        if (te.end_date && te.end_date !== te.date) {
          s.add(`${te.employee_id}_${te.end_date}`);
        }
      }
    });
    return s;
  }, [timeEntries]);

  // Identify missing: employees with GPS rides but NO TimeEntry for that date
  const missingData = useMemo(() => {
    // Group links by employee_id + date
    const grouped = {}; // employee_id → { dates: { date → [tripLinks] } }
    tripLinks.forEach((link) => {
      if (!link.employee_id || !link.date) return;
      const key = `${link.employee_id}_${link.date}`;
      if (submittedSet.has(key)) return; // has a TimeEntry, skip
      if (!grouped[link.employee_id]) grouped[link.employee_id] = {};
      if (!grouped[link.employee_id][link.date]) grouped[link.employee_id][link.date] = [];
      grouped[link.employee_id][link.date].push(link);
    });

    // Build display list (empMap defined at component level)

    const result = [];
    for (const [empId, dates] of Object.entries(grouped)) {
      const emp = empMap[empId];
      if (!emp) continue;
      // Only active employees
      if (emp.status !== "Actief") continue;

      const dateEntries = [];
      for (const [date, links] of Object.entries(dates)) {
        // Gather trip record details
        let totalKm = 0;
        let totalHours = 0;
        const plates = new Set();
        links.forEach((l) => {
          const tr = tripRecordMap[l.trip_record_id];
          if (tr) {
            totalKm += tr.total_km || 0;
            totalHours += tr.total_hours || 0;
            if (tr.plate) plates.add(tr.plate);
          }
        });
        dateEntries.push({
          date,
          rideCount: links.length,
          totalKm: Math.round(totalKm),
          totalHours: Math.round(totalHours * 10) / 10,
          plates: Array.from(plates),
        });
      }
      dateEntries.sort((a, b) => b.date.localeCompare(a.date));

      result.push({
        employeeId: empId,
        employeeName: `${emp.first_name || ""} ${emp.prefix ? emp.prefix + " " : ""}${emp.last_name || ""}`.trim(),
        department: emp.department,
        missingDays: dateEntries.length,
        dates: dateEntries,
      });
    }

    result.sort((a, b) => b.missingDays - a.missingDays);
    return result;
  }, [tripLinks, submittedSet, employees, tripRecordMap]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return missingData;
    const q = search.toLowerCase();
    return missingData.filter(
      (m) =>
        m.employeeName.toLowerCase().includes(q) ||
        (m.department || "").toLowerCase().includes(q)
    );
  }, [missingData, search]);

  const totalMissingDays = filtered.reduce((s, m) => s + m.missingDays, 0);
  const isLoading = loadingLinks || loadingEntries || loadingRecords;

  const toggleExpand = (empId) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Periode:</span>
          {[3, 7, 14, 30].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={daysBack === d ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setDaysBack(d)}
            >
              {d} dagen
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Zoek chauffeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={() => { refetchLinks(); refetchEntries(); }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Ververs
        </Button>
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="flex items-center gap-4 text-sm">
          <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            {filtered.length} chauffeurs · {totalMissingDays} ontbrekende dagen
          </Badge>
          <span className="text-slate-500">
            {dateFrom} t/m {dateTo}
          </span>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">
            Alle diensten ingevuld!
          </h3>
          <p className="text-slate-500 mt-1">
            Geen chauffeurs met GPS-activiteit zonder tijdregistratie in deze
            periode.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const expanded = expandedEmployees.has(item.employeeId);
            return (
              <Card key={item.employeeId}>
                <CardContent className="px-4 py-3">
                  <button
                    className="w-full flex items-center justify-between gap-3"
                    onClick={() => toggleExpand(item.employeeId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {item.employeeName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.department}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            {item.missingDays}{" "}
                            {item.missingDays === 1 ? "dag" : "dagen"} niet
                            ingevuld
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => sendReminder(item, e)}
                        disabled={sendingMail === item.employeeId || sentMails.has(item.employeeId)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          sentMails.has(item.employeeId)
                            ? "bg-green-100 text-green-600"
                            : "hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                        }`}
                        title={sentMails.has(item.employeeId) ? "Verstuurd" : "Stuur herinnering"}
                      >
                        {sendingMail === item.employeeId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : sentMails.has(item.employeeId) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                        {item.missingDays}
                      </Badge>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {item.dates.map((d) => (
                        <div
                          key={d.date}
                          className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {format(new Date(d.date), "EEE d MMM", {
                                locale: nl,
                              })}
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              <Truck className="w-3.5 h-3.5" />
                              {d.rideCount}{" "}
                              {d.rideCount === 1 ? "rit" : "ritten"}
                            </span>
                            {d.totalKm > 0 && (
                              <span className="text-slate-500">
                                {d.totalKm} km
                              </span>
                            )}
                            {d.totalHours > 0 && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3.5 h-3.5" />
                                {d.totalHours}u
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {d.plates.map((p) => (
                              <Badge
                                key={p}
                                variant="outline"
                                className="text-[11px] font-mono"
                              >
                                {p}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}