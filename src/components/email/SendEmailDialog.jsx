import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, User, Users, CheckCircle2, AlertCircle } from "lucide-react";
import ReactQuill from "react-quill";
import { getFullName } from "@/components/utils/employeeUtils";

const departments = ["Management", "Transport", "PakketDistributie", "Charters"];

export default function SendEmailDialog({ open, onOpenChange }) {
  const [mode, setMode] = useState("individual"); // individual | department
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState("info@interdistri.nl");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => base44.entities.EmailTemplate.list(),
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "Actief" && e.email),
    [employees]
  );

  const departmentEmployees = useMemo(
    () => selectedDepartment ? activeEmployees.filter((e) => e.department === selectedDepartment) : [],
    [activeEmployees, selectedDepartment]
  );

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      if (template.reply_to) setReplyTo(template.reply_to);
    }
  };

  const toggleEmployee = (id) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getRecipientEmails = () => {
    if (mode === "individual") {
      return activeEmployees.filter((e) => selectedEmployeeIds.includes(e.id)).map((e) => e.email);
    }
    return departmentEmployees.map((e) => e.email);
  };

  const recipientCount = mode === "individual" ? selectedEmployeeIds.length : departmentEmployees.length;

  const handleSend = async () => {
    const emails = getRecipientEmails();
    if (emails.length === 0 || !subject || !body) return;

    setSending(true);
    setResult(null);

    const response = await base44.functions.invoke("sendEmployeeEmail", {
      to_emails: emails,
      subject,
      body,
      reply_to: replyTo || undefined,
    });

    setResult(response.data);
    setSending(false);
  };

  const resetForm = () => {
    setSelectedEmployeeIds([]);
    setSelectedDepartment("");
    setSelectedTemplateId("");
    setSubject("");
    setBody("");
    setReplyTo("info@interdistri.nl");
    setResult(null);
    setSending(false);
  };

  const handleClose = (open) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verzendresultaat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center py-4">
            {result.failed === 0 ? (
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            ) : (
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
            )}
            <div>
              <p className="text-lg font-semibold">
                {result.sent} van {result.sent + result.failed} e-mails verzonden
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {result.failed} e-mail(s) mislukt
                </p>
              )}
            </div>
            <Button onClick={() => handleClose(false)} className="bg-blue-600 hover:bg-blue-700">
              Sluiten
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>E-mail verzenden</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="gap-2">
                <User className="w-4 h-4" /> Individueel
              </TabsTrigger>
              <TabsTrigger value="department" className="gap-2">
                <Users className="w-4 h-4" /> Per afdeling
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-4">
              <div className="space-y-2">
                <Label>Selecteer medewerkers</Label>
                <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                  {activeEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <span className="text-sm">{getFullName(emp)}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{emp.department}</Badge>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">{selectedEmployeeIds.length} geselecteerd</p>
              </div>
            </TabsContent>

            <TabsContent value="department" className="mt-4">
              <div className="space-y-2">
                <Label>Selecteer afdeling</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger><SelectValue placeholder="Kies een afdeling" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDepartment && (
                  <p className="text-xs text-slate-500">
                    {departmentEmployees.length} medewerker(s) in {selectedDepartment}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Template selector */}
          <div className="space-y-2">
            <Label>Sjabloon (optioneel)</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger><SelectValue placeholder="Kies een sjabloon of schrijf zelf" /></SelectTrigger>
              <SelectContent>
                {templates.filter((t) => t.is_active !== false).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>Onderwerp *</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E-mail onderwerp" />
          </div>

          {/* Reply-To */}
          <div className="space-y-2">
            <Label>Antwoordadres (Reply-To)</Label>
            <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="bijv. info@interdistri.nl" />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label>Inhoud *</Label>
            <div className="[&_.ql-container]:min-h-[180px] [&_.ql-editor]:min-h-[180px]">
              <ReactQuill value={body} onChange={setBody} theme="snow" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-slate-500">
              {recipientCount} ontvanger(s)
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleClose(false)}>Annuleren</Button>
              <Button
                onClick={handleSend}
                disabled={sending || recipientCount === 0 || !subject || !body}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verzenden...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Verzenden ({recipientCount})</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}