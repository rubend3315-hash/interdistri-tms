import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Mail,
  Send,
  Trash2,
  Eye,
  Plus,
  Users,
  Bell,
  FileText
} from "lucide-react";
import EmailTemplateManager from "../components/email/EmailTemplateManager";
import SendEmailDialog from "../components/email/SendEmailDialog";
import EmailLogOverview from "../components/email/EmailLogOverview";

export default function Messages() {
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("berichten");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [newMessage, setNewMessage] = useState({
    to_employee_id: "",
    subject: "",
    content: "",
    priority: "Normaal"
  });

  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date')
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const currentEmployee = employees.find(e => e.email === currentUser?.email);

  const createMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowNewMessageDialog(false);
      setNewMessage({
        to_employee_id: "",
        subject: "",
        content: "",
        priority: "Normaal"
      });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.to_employee_id || !newMessage.content) {
      alert('Selecteer een ontvanger en voer een bericht in');
      return;
    }

    createMessageMutation.mutate({
      ...newMessage,
      from_employee_id: currentEmployee?.id
    });
  };

  const sentMessages = messages.filter(m => m.from_employee_id === currentEmployee?.id);
  const receivedMessages = messages.filter(m => m.to_employee_id === currentEmployee?.id);
  const unreadMessages = receivedMessages.filter(m => !m.is_read);

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Onbekend';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Communicatie</h1>
          <p className="text-slate-500 mt-1">Berichten & e-mails naar medewerkers</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowSendEmailDialog(true)}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Mail className="w-4 h-4 mr-2" />
            E-mail versturen
          </Button>
          <Button 
            onClick={() => setShowNewMessageDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuw bericht
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="berichten" className="gap-2">
            <Mail className="w-4 h-4" /> Berichten
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Send className="w-4 h-4" /> E-mail
          </TabsTrigger>
          <TabsTrigger value="sjablonen" className="gap-2">
            <FileText className="w-4 h-4" /> Sjablonen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sjablonen" className="mt-6">
          <EmailTemplateManager />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailLogOverview />
        </TabsContent>

        <TabsContent value="berichten" className="mt-6">

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ongelezen</p>
                <p className="text-2xl font-bold text-slate-900">{unreadMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Verzonden</p>
                <p className="text-2xl font-bold text-slate-900">{sentMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ontvangen</p>
                <p className="text-2xl font-bold text-slate-900">{receivedMessages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Tabs */}
      <Tabs defaultValue="received">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="gap-2">
            <Mail className="w-4 h-4" />
            Ontvangen ({receivedMessages.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <Send className="w-4 h-4" />
            Verzonden ({sentMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3 mt-4">
          {receivedMessages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Geen ontvangen berichten</p>
              </CardContent>
            </Card>
          ) : (
            receivedMessages.map(message => {
              const messageDate = message.created_date ? new Date(message.created_date) : new Date();
              return (
                <Card 
                  key={message.id}
                  className={`${!message.is_read ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {!message.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                          <h3 className="font-semibold text-slate-900">
                            {message.subject || 'Bericht'}
                          </h3>
                          {message.priority === 'Urgent' && (
                            <Badge className="bg-red-100 text-red-700">Urgent</Badge>
                          )}
                          {message.priority === 'Hoog' && (
                            <Badge className="bg-amber-100 text-amber-700">Hoog</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          Van: {getEmployeeName(message.from_employee_id)}
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                          {message.content}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(messageDate, "d MMMM yyyy, HH:mm", { locale: nl })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!message.is_read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsReadMutation.mutate(message.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Bericht verwijderen?')) {
                              deleteMessageMutation.mutate(message.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3 mt-4">
          {sentMessages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Geen verzonden berichten</p>
              </CardContent>
            </Card>
          ) : (
            sentMessages.map(message => {
              const messageDate = message.created_date ? new Date(message.created_date) : new Date();
              return (
                <Card key={message.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">
                            {message.subject || 'Bericht'}
                          </h3>
                          {message.priority === 'Urgent' && (
                            <Badge className="bg-red-100 text-red-700">Urgent</Badge>
                          )}
                          {message.priority === 'Hoog' && (
                            <Badge className="bg-amber-100 text-amber-700">Hoog</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          Aan: {getEmployeeName(message.to_employee_id)}
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                          {message.content}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(messageDate, "d MMMM yyyy, HH:mm", { locale: nl })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Bericht verwijderen?')) {
                            deleteMessageMutation.mutate(message.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      </TabsContent>
      </Tabs>

      {/* Send Email Dialog */}
      <SendEmailDialog open={showSendEmailDialog} onOpenChange={setShowSendEmailDialog} />

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nieuw bericht</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ontvanger *</Label>
              <Select 
                value={newMessage.to_employee_id} 
                onValueChange={(v) => setNewMessage({ ...newMessage, to_employee_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'Actief').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Onderwerp</Label>
              <Input
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Onderwerp (optioneel)"
              />
            </div>

            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select 
                value={newMessage.priority} 
                onValueChange={(v) => setNewMessage({ ...newMessage, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normaal">Normaal</SelectItem>
                  <SelectItem value="Hoog">Hoog</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bericht *</Label>
              <Textarea
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                rows={6}
                placeholder="Typ je bericht hier..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowNewMessageDialog(false)}
              >
                Annuleren
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={createMessageMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {createMessageMutation.isPending ? 'Bezig...' : 'Versturen'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}