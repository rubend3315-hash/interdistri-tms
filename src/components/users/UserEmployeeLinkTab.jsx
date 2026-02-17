import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Link2,
  Unlink,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Users,
  Mail,
} from "lucide-react";
import { logAuditEvent } from "../utils/auditLogger";

export default function UserEmployeeLinkTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, linked, unlinked_employees, unlinked_users
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date"),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-link"],
    queryFn: () => base44.entities.Employee.list("last_name"),
  });

  // Build linking data
  const linkData = React.useMemo(() => {
    const linked = [];
    const unmatchedEmployees = [];
    const unmatchedUsers = [];
    const matchedUserEmails = new Set();
    const matchedEmpEmails = new Set();

    // Find matches based on email
    employees.forEach((emp) => {
      if (!emp.email) {
        unmatchedEmployees.push({ employee: emp, reason: "Geen email ingevuld" });
        return;
      }
      const matchingUser = users.find(
        (u) => u.email?.toLowerCase() === emp.email?.toLowerCase()
      );
      if (matchingUser) {
        linked.push({ employee: emp, user: matchingUser });
        matchedUserEmails.add(matchingUser.email?.toLowerCase());
        matchedEmpEmails.add(emp.email?.toLowerCase());
      } else {
        unmatchedEmployees.push({ employee: emp, reason: "Geen gebruikersaccount" });
      }
    });

    // Find users without employee
    users.forEach((u) => {
      if (!matchedUserEmails.has(u.email?.toLowerCase())) {
        unmatchedUsers.push({ user: u, reason: "Geen medewerker gekoppeld" });
      }
    });

    // Detect status mismatches
    const statusMismatches = linked.filter((item) => {
      const empInactive =
        item.employee.status === "Uit dienst" ||
        item.employee.status === "Inactief";
      const userIsAdmin = item.user.role === "admin";
      // Only flag if employee is inactive but user still has access (non-admin)
      return empInactive && !userIsAdmin;
    });

    return { linked, unmatchedEmployees, unmatchedUsers, statusMismatches };
  }, [users, employees]);

  // Filter results based on search and filter
  const getFilteredResults = () => {
    const search = searchTerm.toLowerCase();

    const matchesSearch = (name, email) =>
      !search ||
      name?.toLowerCase().includes(search) ||
      email?.toLowerCase().includes(search);

    switch (filter) {
      case "linked":
        return {
          type: "linked",
          items: linkData.linked.filter(
            (item) =>
              matchesSearch(
                item.employee.first_name + " " + item.employee.last_name,
                item.employee.email
              ) ||
              matchesSearch(item.user.full_name, item.user.email)
          ),
        };
      case "unlinked_employees":
        return {
          type: "unlinked_employees",
          items: linkData.unmatchedEmployees.filter((item) =>
            matchesSearch(
              item.employee.first_name + " " + item.employee.last_name,
              item.employee.email
            )
          ),
        };
      case "unlinked_users":
        return {
          type: "unlinked_users",
          items: linkData.unmatchedUsers.filter((item) =>
            matchesSearch(item.user.full_name, item.user.email)
          ),
        };
      case "mismatches":
        return {
          type: "mismatches",
          items: linkData.statusMismatches.filter(
            (item) =>
              matchesSearch(
                item.employee.first_name + " " + item.employee.last_name,
                item.employee.email
              ) ||
              matchesSearch(item.user.full_name, item.user.email)
          ),
        };
      default:
        return { type: "all", items: null };
    }
  };

  const filtered = getFilteredResults();

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Gekoppeld"
          count={linkData.linked.length}
          icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
          color="bg-emerald-50 border-emerald-200"
          active={filter === "linked"}
          onClick={() => setFilter(filter === "linked" ? "all" : "linked")}
        />
        <SummaryCard
          label="Medewerkers zonder account"
          count={linkData.unmatchedEmployees.length}
          icon={<UserX className="w-5 h-5 text-amber-600" />}
          color="bg-amber-50 border-amber-200"
          active={filter === "unlinked_employees"}
          onClick={() =>
            setFilter(filter === "unlinked_employees" ? "all" : "unlinked_employees")
          }
        />
        <SummaryCard
          label="Accounts zonder medewerker"
          count={linkData.unmatchedUsers.length}
          icon={<Unlink className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50 border-blue-200"
          active={filter === "unlinked_users"}
          onClick={() =>
            setFilter(filter === "unlinked_users" ? "all" : "unlinked_users")
          }
        />
        <SummaryCard
          label="Status mismatch"
          count={linkData.statusMismatches.length}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          color="bg-red-50 border-red-200"
          active={filter === "mismatches"}
          onClick={() =>
            setFilter(filter === "mismatches" ? "all" : "mismatches")
          }
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Zoek op naam of email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results */}
      {filter === "all" ? (
        <AllOverview linkData={linkData} searchTerm={searchTerm} />
      ) : filtered.type === "linked" || filtered.type === "mismatches" ? (
        <LinkedList items={filtered.items} showMismatch={filtered.type === "mismatches"} />
      ) : filtered.type === "unlinked_employees" ? (
        <UnlinkedEmployeesList items={filtered.items} />
      ) : (
        <UnlinkedUsersList items={filtered.items} />
      )}
    </div>
  );
}

function SummaryCard({ label, count, icon, color, active, onClick }) {
  return (
    <Card
      className={`cursor-pointer transition-all ${color} ${
        active ? "ring-2 ring-blue-500" : ""
      } hover:shadow-md`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between">
          {icon}
          <span className="text-2xl font-bold">{count}</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function AllOverview({ linkData, searchTerm }) {
  const search = searchTerm.toLowerCase();

  return (
    <div className="space-y-4">
      {linkData.statusMismatches.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              Status mismatches — Actie vereist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkData.statusMismatches
                .filter(
                  (item) =>
                    !search ||
                    (item.employee.first_name + " " + item.employee.last_name)
                      .toLowerCase()
                      .includes(search) ||
                    item.employee.email?.toLowerCase().includes(search)
                )
                .map((item) => (
                  <div
                    key={item.employee.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {item.employee.first_name}{" "}
                        {item.employee.prefix ? item.employee.prefix + " " : ""}
                        {item.employee.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{item.employee.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        Medewerker: {item.employee.status}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        User: {item.user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Overzicht koppelingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <strong>{linkData.linked.length}</strong> medewerkers zijn correct gekoppeld
              aan een gebruikersaccount.
            </p>
            <p>
              <strong>{linkData.unmatchedEmployees.length}</strong> medewerkers hebben nog
              geen gebruikersaccount.
            </p>
            <p>
              <strong>{linkData.unmatchedUsers.length}</strong> gebruikersaccounts zijn niet
              gekoppeld aan een medewerker.
            </p>
            {linkData.statusMismatches.length > 0 && (
              <p className="text-red-600 font-medium">
                <strong>{linkData.statusMismatches.length}</strong> koppelingen hebben een
                status mismatch (medewerker inactief/uit dienst maar account nog actief).
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LinkedList({ items, showMismatch }) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-8">
        <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">Geen resultaten gevonden</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Medewerker
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Medewerker Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                User Rol
              </th>
              <th className="text-center py-3 px-4 font-semibold text-slate-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const empInactive =
                item.employee.status === "Uit dienst" ||
                item.employee.status === "Inactief";
              return (
                <tr key={item.employee.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {item.employee.employee_number && (
                        <span className="text-slate-400 mr-1">
                          {item.employee.employee_number}
                        </span>
                      )}
                      {item.employee.first_name}{" "}
                      {item.employee.prefix ? item.employee.prefix + " " : ""}
                      {item.employee.last_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.employee.department} — {item.employee.function || "Geen functie"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{item.employee.email}</td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        item.employee.status === "Actief"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.employee.status === "Inactief"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-red-100 text-red-700"
                      }
                    >
                      {item.employee.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      className={
                        item.user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {item.user.role === "admin" ? "Admin" : "Medewerker"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {empInactive && item.user.role !== "admin" ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Mismatch
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        OK
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UnlinkedEmployeesList({ items }) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-8">
        <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">Alle medewerkers zijn gekoppeld</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Medewerker
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Afdeling
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Reden
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.employee.id} className="border-b hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="font-medium">
                    {item.employee.employee_number && (
                      <span className="text-slate-400 mr-1">
                        {item.employee.employee_number}
                      </span>
                    )}
                    {item.employee.first_name}{" "}
                    {item.employee.prefix ? item.employee.prefix + " " : ""}
                    {item.employee.last_name}
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {item.employee.email || (
                    <span className="text-red-500 italic">Geen email</span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-600">
                  {item.employee.department}
                </td>
                <td className="py-3 px-4">
                  <Badge
                    className={
                      item.employee.status === "Actief"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }
                  >
                    {item.employee.status}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs text-amber-600">
                  {item.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UnlinkedUsersList({ items }) {
  if (items.length === 0) {
    return (
      <Card className="text-center py-8">
        <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">Alle accounts zijn gekoppeld</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Naam
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Email
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Rol
              </th>
              <th className="text-left py-3 px-4 font-semibold text-slate-700">
                Reden
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.user.id} className="border-b hover:bg-slate-50">
                <td className="py-3 px-4 font-medium">
                  {item.user.full_name || "Naamloos"}
                </td>
                <td className="py-3 px-4 text-slate-600">{item.user.email}</td>
                <td className="py-3 px-4">
                  <Badge
                    className={
                      item.user.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-700"
                    }
                  >
                    {item.user.role === "admin" ? "Admin" : "Medewerker"}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-xs text-blue-600">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}