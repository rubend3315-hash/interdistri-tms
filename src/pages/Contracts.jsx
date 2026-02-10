import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Plus,
  Sparkles,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  UserCheck,
  Settings,
  Shield,
  BookOpen,
  Loader2,
  Trash2
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContractEditDialog from "../components/contracts/ContractEditDialog";
import ContractPreviewEditor from "../components/contracts/ContractPreviewEditor";

export default function Contracts() {
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [deleteContract, setDeleteContract] = useState(null);

  // AI analysis state
  const [conflictAnalysis, setConflictAnalysis] = useState(null);
  const [clauseSummary, setClauseSummary] = useState(null);
  const [loadingConflicts, setLoadingConflicts] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [generateForm, setGenerateForm] = useState({
    employee_id: "",
    contract_type: "Vast",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    hours_per_week: 40,
    proeftijd: "Geen proeftijd",
    is_verlenging: false,
    oorspronkelijke_indienst_datum: ""
  });
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => base44.entities.Contract.list('-created_date')
  });

  const generateContractMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('generateContract', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowGenerateDialog(false);
      setShowPreviewDialog(false);
      setPreviewHtml(null);
      setGenerateForm({
        employee_id: "",
        contract_type: "Vast",
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: "",
        hours_per_week: 40,
        proeftijd: "Geen proeftijd",
        is_verlenging: false,
        oorspronkelijke_indienst_datum: ""
      });
      if (data?.contract) {
        setSelectedContract(data.contract);
        setConflictAnalysis(data.conflict_analysis || null);
        setClauseSummary(data.clause_summary || null);
        setShowViewDialog(true);
      }
    }
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contract.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const deleteContractMutation = useMutation({
    mutationFn: (id) => base44.entities.Contract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setDeleteContract(null);
    }
  });

  // Canvas drawing functions
  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  React.useEffect(() => {
    if (showSignDialog && canvasRef.current) {
      clearSignature();
    }
  }, [showSignDialog]);

  const handleSign = async () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');

    const isManager = user?.role === 'admin';
    const updateData = isManager ? {
      manager_signature_url: dataUrl,
      manager_signed_date: new Date().toISOString(),
      manager_signed_by: user.full_name,
      status: selectedContract.employee_signature_url ? 'Ondertekend' : 'TerOndertekening'
    } : {
      employee_signature_url: dataUrl,
      employee_signed_date: new Date().toISOString(),
      status: selectedContract.manager_signature_url ? 'Ondertekend' : 'TerOndertekening'
    };

    // If both signatures are present, activate the contract
    if ((isManager && selectedContract.employee_signature_url) || 
        (!isManager && selectedContract.manager_signature_url)) {
      updateData.status = 'Actief';
    }

    await updateContractMutation.mutateAsync({
      id: selectedContract.id,
      data: updateData
    });

    setShowSignDialog(false);
    setSignature(null);
  };

  const getStatusBadge = (contract) => {
    const statusConfig = {
      'Concept': { bg: 'bg-slate-100', text: 'text-slate-700', icon: Settings },
      'TerOndertekening': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
      'Ondertekend': { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle },
      'Actief': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
      'Verlopen': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
      'Beëindigd': { bg: 'bg-slate-100', text: 'text-slate-700', icon: AlertTriangle }
    };

    const config = statusConfig[contract.status] || statusConfig['Concept'];
    const Icon = config.icon;

    return (
      <Badge className={`${config.bg} ${config.text} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {contract.status}
      </Badge>
    );
  };

  const handleAnalyzeContract = async (contractId, action) => {
    if (action === 'conflict_analysis') {
      setLoadingConflicts(true);
      setConflictAnalysis(null);
      try {
        const res = await base44.functions.invoke('analyzeContract', { contract_id: contractId, action });
        setConflictAnalysis(res.data.analysis);
      } catch (err) {
        console.error(err);
      }
      setLoadingConflicts(false);
    } else if (action === 'clause_summary') {
      setLoadingSummary(true);
      setClauseSummary(null);
      try {
        const res = await base44.functions.invoke('analyzeContract', { contract_id: contractId, action });
        setClauseSummary(res.data.summary);
      } catch (err) {
        console.error(err);
      }
      setLoadingSummary(false);
    }
  };

  const handleOpenContract = (contract) => {
    setSelectedContract(contract);
    setConflictAnalysis(null);
    setClauseSummary(null);
    setShowViewDialog(true);
  };

  const handleSaveContract = async (data) => {
    await updateContractMutation.mutateAsync({
      id: selectedContract.id,
      data
    });
    // Refresh selectedContract with new data
    setSelectedContract(prev => ({ ...prev, ...data }));
  };

  const [sendingContract, setSendingContract] = useState(null);

  const handleSendForSigning = async (contract) => {
    setSendingContract(contract.id);
    try {
      await base44.functions.invoke('sendContractForSigning', { contract_id: contract.id });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    } catch (err) {
      console.error('Fout bij verzenden contract:', err);
    }
    setSendingContract(null);
  };

  const activeContracts = contracts.filter(c => c.status === 'Actief' || c.status === 'Ondertekend');
  const pendingContracts = contracts.filter(c => c.status === 'TerOndertekening');
  const draftContracts = contracts.filter(c => c.status === 'Concept');

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contracten</h1>
          <p className="text-slate-500 mt-1">Beheer arbeidscontracten met AI en digitale handtekeningen</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowGenerateDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Genereer Contract
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Actieve Contracten</p>
                <p className="text-2xl font-bold text-emerald-600">{activeContracts.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ter Ondertekening</p>
                <p className="text-2xl font-bold text-amber-600">{pendingContracts.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Concept</p>
                <p className="text-2xl font-bold text-slate-600">{draftContracts.length}</p>
              </div>
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totaal</p>
                <p className="text-2xl font-bold text-blue-600">{contracts.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts List */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Alle ({contracts.length})</TabsTrigger>
          <TabsTrigger value="active">Actief ({activeContracts.length})</TabsTrigger>
          <TabsTrigger value="pending">Ter Ondertekening ({pendingContracts.length})</TabsTrigger>
          <TabsTrigger value="draft">Concept ({draftContracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loadingContracts ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : contracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Nog geen contracten. Genereer je eerste contract met AI.
              </CardContent>
            </Card>
          ) : (
            contracts.map(contract => {
              const employee = employees.find(e => e.id === contract.employee_id);
              const daysUntilExpiry = contract.end_date ? 
                differenceInDays(new Date(contract.end_date), new Date()) : null;

              return (
                <Card key={contract.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-slate-900">
                            {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                          </h3>
                          {getStatusBadge(contract)}
                          {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                            <Badge className="bg-amber-100 text-amber-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Verloopt over {daysUntilExpiry} dagen
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Contractnummer</p>
                            <p className="font-medium">{contract.contract_number}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Type</p>
                            <p className="font-medium">{contract.contract_type}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Startdatum</p>
                            <p className="font-medium">
                              {format(new Date(contract.start_date), 'd MMM yyyy', { locale: nl })}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Uren/week</p>
                            <p className="font-medium">{contract.hours_per_week}u</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                          {contract.employee_signature_url && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              <span>Chauffeur getekend</span>
                            </div>
                          )}
                          {contract.manager_signature_url && (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                              <span>Management getekend</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenContract(contract)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {contract.status === 'Concept' && isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendForSigning(contract)}
                            disabled={sendingContract === contract.id}
                          >
                            {sendingContract === contract.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {contract.status === 'TerOndertekening' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowSignDialog(true);
                            }}
                            disabled={
                              (isAdmin && contract.manager_signature_url) ||
                              (!isAdmin && contract.employee_signature_url)
                            }
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Onderteken
                          </Button>
                        )}
                        {isAdmin && contract.status !== 'Actief' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteContract(contract)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="active">
          {activeContracts.map(contract => {
            const employee = employees.find(e => e.id === contract.employee_id);
            return (
              <Card key={contract.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                      </h3>
                      <p className="text-sm text-slate-500">{contract.contract_number}</p>
                    </div>
                    {getStatusBadge(contract)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="pending">
          {pendingContracts.map(contract => {
            const employee = employees.find(e => e.id === contract.employee_id);
            return (
              <Card key={contract.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                      </h3>
                      <p className="text-sm text-slate-500">{contract.contract_number}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowSignDialog(true);
                      }}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Onderteken
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="draft">
          {draftContracts.map(contract => {
            const employee = employees.find(e => e.id === contract.employee_id);
            return (
              <Card key={contract.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                      </h3>
                      <p className="text-sm text-slate-500">{contract.contract_number}</p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendForSigning(contract)}
                        disabled={sendingContract === contract.id}
                      >
                        {sendingContract === contract.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-1" />
                        )}
                        Versturen
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* Generate Contract Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Contract Genereren met AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medewerker</Label>
              <Select
                value={generateForm.employee_id}
                onValueChange={(v) => setGenerateForm({ ...generateForm, employee_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.status === 'Actief').map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.function}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contracttype</Label>
              <Select
                value={generateForm.contract_type}
                onValueChange={(v) => setGenerateForm({ ...generateForm, contract_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vast">Vast</SelectItem>
                  <SelectItem value="Tijdelijk">Tijdelijk</SelectItem>
                  <SelectItem value="Oproep">Oproep</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`grid ${generateForm.contract_type !== 'Vast' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={generateForm.start_date}
                  onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                />
              </div>
              {generateForm.contract_type !== 'Vast' && (
                <div className="space-y-2">
                  <Label>Einddatum</Label>
                  <Input
                    type="date"
                    value={generateForm.end_date}
                    onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                  />
                </div>
              )}
            </div>

            {generateForm.contract_type !== 'Oproep' && (
              <div className="space-y-2">
                <Label>Uren per week</Label>
                <Input
                  type="number"
                  value={generateForm.hours_per_week}
                  onChange={(e) => setGenerateForm({ ...generateForm, hours_per_week: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Proeftijd</Label>
              <Select
                value={generateForm.proeftijd}
                onValueChange={(v) => setGenerateForm({ ...generateForm, proeftijd: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geen proeftijd">Geen proeftijd</SelectItem>
                  <SelectItem value="1 maand proeftijd">1 maand proeftijd</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generateForm.is_verlenging}
                  onChange={(e) => setGenerateForm({ ...generateForm, is_verlenging: e.target.checked })}
                  className="rounded"
                />
                Dit is een verlenging
              </Label>
            </div>

            {generateForm.is_verlenging && (
              <div className="space-y-2">
                <Label>Oorspronkelijke datum in dienst</Label>
                <Input
                  type="date"
                  value={generateForm.oorspronkelijke_indienst_datum}
                  onChange={(e) => setGenerateForm({ ...generateForm, oorspronkelijke_indienst_datum: e.target.value })}
                />
              </div>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={async () => {
                const res = await base44.functions.invoke('generateContract', {
                  ...generateForm,
                  preview_only: true
                });
                setPreviewHtml(res.data.preview_html);
                setShowGenerateDialog(false);
                setShowPreviewDialog(true);
              }}
              disabled={!generateForm.employee_id || generateContractMutation.isPending}
            >
              <Eye className="w-4 h-4 mr-2" />
              Voorbeeld bekijken
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Contract Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Contract Voorbeeld - Aanpassen en Opslaan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ContractPreviewEditor
              html={previewHtml}
              onChange={setPreviewHtml}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setShowPreviewDialog(false);
                setShowGenerateDialog(true);
              }}>
                Terug
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => generateContractMutation.mutate({
                  ...generateForm,
                  final_html: previewHtml
                })}
                disabled={generateContractMutation.isPending}
              >
                {generateContractMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Opslaan...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Contract Opslaan</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Contract Dialog */}
      <ContractEditDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        contract={selectedContract}
        employee={selectedContract ? employees.find(e => e.id === selectedContract.employee_id) : null}
        isAdmin={isAdmin}
        onSave={handleSaveContract}
        saving={updateContractMutation.isPending}
        onAnalyze={(action) => handleAnalyzeContract(selectedContract?.id, action)}
        conflictAnalysis={conflictAnalysis}
        clauseSummary={clauseSummary}
        loadingConflicts={loadingConflicts}
        loadingSummary={loadingSummary}
      />

      {/* Delete Contract Dialog */}
      <AlertDialog open={!!deleteContract} onOpenChange={(open) => !open && setDeleteContract(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Contract verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je contract <strong>{deleteContract?.contract_number}</strong> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteContractMutation.mutate(deleteContract.id)}
              disabled={deleteContractMutation.isPending}
            >
              {deleteContractMutation.isPending ? "Verwijderen..." : "Verwijderen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign Contract Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Contract Ondertekenen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Teken hieronder om het contract te ondertekenen:
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-lg">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="touch-none w-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={clearSignature}>
                Wissen
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleSign}
                disabled={updateContractMutation.isPending}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Ondertekenen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}