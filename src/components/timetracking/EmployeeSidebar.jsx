import React from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const departments = ["Management", "Transport", "PakketDistributie", "Charters"];

export default function EmployeeSidebar({ employees, selectedEmployeeId, onSelectEmployee }) {
  const [search, setSearch] = React.useState("");
  const [expandedDepts, setExpandedDepts] = React.useState(departments);

  const toggleDept = (dept) => {
    setExpandedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const getFullName = (e) => [e.first_name, e.prefix, e.last_name].filter(Boolean).join(' ');

  const filteredEmployees = employees.filter(e => {
    const name = getFullName(e).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const grouped = departments.reduce((acc, dept) => {
    acc[dept] = filteredEmployees
      .filter(e => e.department === dept)
      .sort((a, b) => getFullName(a).localeCompare(getFullName(b)));
    return acc;
  }, {});

  return (
    <div className="w-full h-full flex flex-col bg-white border rounded-xl overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-slate-900 mb-2">Medewerkers</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            placeholder="Zoek medewerker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {departments.map(dept => {
          const deptEmployees = grouped[dept] || [];
          if (deptEmployees.length === 0) return null;
          const isExpanded = expandedDepts.includes(dept);

          return (
            <div key={dept}>
              <button
                onClick={() => toggleDept(dept)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-50 border-b"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Afdeling: {dept}
                <span className="ml-auto text-slate-400 normal-case">{deptEmployees.length}</span>
              </button>
              {isExpanded && deptEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => onSelectEmployee(emp.id)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm border-b border-slate-50 hover:bg-blue-50 transition-colors",
                    selectedEmployeeId === emp.id
                      ? "bg-blue-50 text-blue-700 font-medium border-l-2 border-l-blue-600"
                      : "text-slate-700"
                  )}
                >
                  ({emp.employee_number || '-'}) {getFullName(emp)}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}