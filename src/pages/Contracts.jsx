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
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  UserCheck,
  Settings,
  Loader2,
  Trash2,
  Save,
  RotateCw,
  UserPlus,
  XCircle,
  Download
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ContractEditDialog from "../components/contracts/ContractEditDialog";
import ContractPreviewEditor from "../components/contracts/ContractPreviewEditor";

function DownloadContractButton({ contractId, contractNumber }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    const response = await base44.functions.invoke('downloadContractPdf', { contract_id: contractId });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_${contractNumber || contractId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    setDownloading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} title="Download PDF">
      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
    </Button>
  );
}

export default function Contracts() {
  // v2
  const queryClient = useQueryClient();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [deleteContract, setDeleteContract] = useState(null);

  const [generateForm, setGenerateForm] = useState({
    employee_id: "",
    contract_type: "Vast",
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    hours_per_week: 40,
    template_id: ""
  });
  const [previewHtml, setPreviewHtml] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === 'admin';

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    enabled: isAdmin
  });

  // Admin: use backend function for light list; Employee: also uses it (it filters server-side)
  const { data: allContracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const response = await base44.functions.invoke('listContractsLight');
      return response.data?.contracts || [];
    }
  });

  // For employee view: fetch their full contracts with content for reading & signing
  const { data: employeeFullContracts = [], isLoading: loadingEmployeeContracts } = useQuery({
    queryKey: ['employeeFullContracts'],
    queryFn: async () => {
      // allContracts already filtered server-side for non-admin
      if (allContracts.length === 0) return [];
      // Fetch full contracts with content
      const fullContracts = await Promise.all(
        allContracts
          .filter(c => c.status === 'TerOndertekening')
          .map(c => base44.entities.Contract.filter({ id: c.id }).then(res => res[0]))
      );
      return fullContracts.filter(Boolean);
    },
    enabled: !isAdmin && !loadingUser && allContracts.length > 0
  });

  const contracts = allContracts;

  const { data: templates = [] } = useQuery({
    queryKey: ['contractTemplates'],
    queryFn: () => base44.entities.ContractTemplate.filter({ status: 'Actief' }),
    enabled: isAdmin
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
        template_id: ""
      });
      if (data?.contract) {
        setSelectedContract(data.contract);
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
    // Always ensure pen is black and visible
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * scaleX;
    const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * scaleY;
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
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  React.useEffect(() => {
    if (showSignDialog && canvasRef.current) {
      clearSignature();
    }
  }, [showSignDialog]);

  const handleSign = async () => {
    const canvas = canvasRef.current;
    // Create a new canvas with white background to ensure no transparency
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.fillStyle = 'white';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(canvas, 0, 0);
    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

    // Convert base64 to file and upload - JPEG has no alpha channel, avoids PDF rendering issues
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], `signature_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const isManager = user?.role === 'admin';
    const updateData = isManager ? {
      manager_signature_url: file_url,
      manager_signed_date: new Date().toISOString(),
      manager_signed_by: user.full_name,
      status: selectedContract.employee_signature_url ? 'Actief' : 'TerOndertekening'
    } : {
      employee_signature_url: file_url,
      employee_signed_date: new Date().toISOString(),
      status: selectedContract.manager_signature_url ? 'Actief' : 'TerOndertekening'
    };

    await updateContractMutation.mutateAsync({
      id: selectedContract.id,
      data: updateData
    });

    // Send notifications asynchronously (don't block UI)
    base44.functions.invoke('notifyContractSigned', {
      contract_id: selectedContract.id,
      signer_role: isManager ? 'manager' : 'employee'
    }).catch(err => console.error('Notificatie fout:', err));

    queryClient.invalidateQueries({ queryKey: ['contracts'] });

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

  const handleOpenContract = async (contract) => {
    // Fetch full contract with content only when opening
    const fullContracts = await base44.entities.Contract.filter({ id: contract.id });
    const fullContract = fullContracts.length > 0 ? fullContracts[0] : contract;
    setSelectedContract(fullContract);
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
  const [sendError, setSendError] = useState(null);
  const [invitingEmployee, setInvitingEmployee] = useState(false);

  const handleSendForSigning = async (contract, autoInvite = false) => {
    setSendingContract(contract.id);
    setSendError(null);
    try {
      const response = await base44.functions.invoke('sendContractForSigning', { 
        contract_id: contract.id,
        auto_invite: autoInvite
      });
      if (response.data?.invited) {
        setSendError({
          type: 'invited',
          message: response.data.message,
          contract
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['contracts'] });
      }
    } catch (err) {
      const errorData = err?.response?.data;
      if (errorData?.error_type === 'not_app_user') {
        setSendError({
          type: 'not_app_user',
          message: errorData.error,
          employeeName: errorData.employee_name,
          employeeEmail: errorData.employee_email,
          contract
        });
      } else {
        setSendError({
          type: 'general',
          message: errorData?.error || err.message || 'Onbekende fout bij verzenden contract'
        });
      }
    }
    setSendingContract(null);
  };

  const handleInviteAndRetry = async () => {
    if (!sendError?.contract) return;
    setInvitingEmployee(true);
    setSendError(null);
    await handleSendForSigning(sendError.contract, true);
    setInvitingEmployee(false);
  };

  const activeContracts = contracts.filter(c => c.status === 'Actief' || c.status === 'Ondertekend');
  const pendingContracts = contracts.filter(c => c.status === 'TerOndertekening');
  const draftContracts = contracts.filter(c => c.status === 'Concept');

  // Loading state
  if (loadingUser || loadingContracts) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  // ===== EMPLOYEE VIEW: Simple contract reading + signing =====
  if (!isAdmin) {
    const pendingToSign = contracts.filter(c => c.status === 'TerOndertekening' && !c.employee_signature_url);
    const alreadySigned = contracts.filter(c => c.employee_signature_url);
    const otherContracts = contracts.filter(c => c.status !== 'TerOndertekening' && !c.employee_signature_url);

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mijn Contracten</h1>
          <p className="text-slate-500 mt-1">Bekijk en onderteken je arbeidscontracten</p>
        </div>

        {/* Contracts to sign */}
        {pendingToSign.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-amber-700 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Te ondertekenen ({pendingToSign.length})
            </h2>
            {pendingToSign.map(contract => {
              const fullContract = employeeFullContracts.find(fc => fc?.id === contract.id);
              return (
                <Card key={contract.id} className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{contract.contract_number}</h3>
                        <p className="text-sm text-slate-500">{contract.contract_type} — Start: {contract.start_date ? format(new Date(contract.start_date), 'd MMM yyyy', { locale: nl }) : '-'}</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Ter ondertekening
                      </Badge>
                    </div>

                    {/* Show contract content for reading */}
                    {fullContract?.contract_content ? (
                      <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: fullContract.contract_content }} className="prose prose-sm max-w-none" />
                      </div>
                    ) : loadingEmployeeContracts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        <span className="ml-2 text-sm text-slate-500">Contract laden...</span>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => handleOpenContract(contract)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Contract bekijken
                      </Button>
                    )}

                    {/* Sign button */}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setSelectedContract(fullContract || contract);
                        setShowSignDialog(true);
                      }}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Contract ondertekenen
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Already signed / waiting for management */}
        {alreadySigned.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              Ondertekend ({alreadySigned.length})
            </h2>
            {alreadySigned.map(contract => (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">{contract.contract_number}</h3>
                      <p className="text-sm text-slate-500">{contract.contract_type} — Start: {contract.start_date ? format(new Date(contract.start_date), 'd MMM yyyy', { locale: nl }) : '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract)}
                      {contract.employee_signature_url && !contract.manager_signature_url && (
                        <span className="text-xs text-amber-600">Wacht op management</span>
                      )}
                      <DownloadContractButton contractId={contract.id} contractNumber={contract.contract_number} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Other contracts */}
        {otherContracts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-700">Overige contracten</h2>
            {otherContracts.map(contract => (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">{contract.contract_number}</h3>
                      <p className="text-sm text-slate-500">{contract.contract_type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(contract)}
                      <DownloadContractButton contractId={contract.id} contractNumber={contract.contract_number} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Er staan momenteel geen contracten voor je klaar.
            </CardContent>
          </Card>
        )}

        {/* Sign Dialog (reused) */}
        <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Contract Ondertekenen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedContract && (
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-slate-700">
                    {selectedContract.contract_number} — {selectedContract.contract_type}
                  </p>
                  <p className="text-slate-500">
                    Je tekent als: <strong>Medewerker</strong>
                  </p>
                </div>
              )}
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
                  {updateContractMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4 mr-2" />
                  )}
                  Ondertekenen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    );
  }

  // ===== ADMIN VIEW below =====

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contracten</h1>
          <p className="text-slate-500 mt-1">Beheer arbeidscontracten en digitale handtekeningen</p>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuw Contract
        </Button>
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
          {contracts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Nog geen contracten. Genereer je eerste contract.
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
                          {contract.employee_signature_url ? (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              <span>Medewerker getekend</span>
                            </div>
                          ) : contract.status === 'TerOndertekening' && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span className="text-amber-600">Stap 1: Wacht op medewerker</span>
                            </div>
                          )}
                          {contract.manager_signature_url ? (
                            <div className="flex items-center gap-1">
                              <UserCheck className="w-4 h-4 text-blue-600" />
                              <span>Management getekend ({contract.manager_signed_by || 'onbekend'})</span>
                            </div>
                          ) : contract.status === 'TerOndertekening' && contract.employee_signature_url && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span className="text-amber-600">Stap 2: Wacht op management</span>
                            </div>
                          )}
                          {contract.reminder_sent_dates?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Send className="w-3.5 h-3.5 text-slate-400" />
                              <span>{contract.reminder_sent_dates.length}x verzonden</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <DownloadContractButton contractId={contract.id} contractNumber={contract.contract_number} />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenContract(contract)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {contract.status === 'Concept' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendForSigning(contract)}
                            disabled={sendingContract === contract.id}
                            title="Verstuur ter ondertekening"
                          >
                            {sendingContract === contract.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        {contract.status === 'TerOndertekening' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendForSigning(contract)}
                              disabled={sendingContract === contract.id}
                              title="Herinnering versturen"
                            >
                              {sendingContract === contract.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCw className="w-4 h-4" />
                              )}
                            </Button>
                            {contract.employee_signature_url && !contract.manager_signature_url && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  setSelectedContract(contract);
                                  setShowSignDialog(true);
                                }}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Onderteken
                              </Button>
                            )}
                          </>
                        )}
                        {contract.status !== 'Actief' && (
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

        <TabsContent value="pending" className="space-y-4">
          {pendingContracts.map(contract => {
            const employee = employees.find(e => e.id === contract.employee_id);
            return (
              <Card key={contract.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee ? `${employee.first_name} ${employee.last_name}` : 'Onbekend'}
                      </h3>
                      <p className="text-sm text-slate-500">{contract.contract_number}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {contract.employee_signature_url 
                          ? <span className="text-emerald-600 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Medewerker ✓</span> 
                          : <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Stap 1: Wacht op medewerker</span>}
                        {contract.manager_signature_url 
                          ? <span className="text-blue-600 flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Management ✓</span> 
                          : contract.employee_signature_url 
                            ? <span className="text-amber-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Stap 2: Wacht op management</span>
                            : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendForSigning(contract)}
                        disabled={sendingContract === contract.id}
                        title="Herinnering versturen"
                      >
                        {sendingContract === contract.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                      </Button>
                      {contract.employee_signature_url && !contract.manager_signature_url && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowSignDialog(true);
                          }}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Onderteken
                        </Button>
                      )}
                    </div>
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
              <FileText className="w-5 h-5 text-blue-600" />
              Nieuw Contract Genereren
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
                  <SelectItem value="Vast Nul Uren">Vast Nul Uren</SelectItem>
                  <SelectItem value="Tijdelijk">Tijdelijk</SelectItem>
                  <SelectItem value="Tijdelijk Nul Uren">Tijdelijk Nul Uren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const isNulUren = generateForm.contract_type.includes('Nul Uren');
              const isTijdelijk = generateForm.contract_type.includes('Tijdelijk');
              return (
                <>
                  <div className={`grid ${isTijdelijk ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    <div className="space-y-2">
                      <Label>Startdatum</Label>
                      <Input
                        type="date"
                        value={generateForm.start_date}
                        onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                      />
                    </div>
                    {isTijdelijk && (
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

                  {!isNulUren && (
                    <div className="space-y-2">
                      <Label>Uren per week</Label>
                      <Input
                        type="number"
                        value={generateForm.hours_per_week}
                        onChange={(e) => setGenerateForm({ ...generateForm, hours_per_week: e.target.value })}
                      />
                    </div>
                  )}
                </>
              );
            })()}

            {/* Template selectie */}
            {templates.filter(t => t.contract_type === generateForm.contract_type).length > 0 && (
              <div className="space-y-2">
                <Label>Sjabloon</Label>
                <Select
                  value={generateForm.template_id}
                  onValueChange={(v) => setGenerateForm({ ...generateForm, template_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Standaard sjabloon gebruiken" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Standaard sjabloon</SelectItem>
                    {templates
                      .filter(t => t.contract_type === generateForm.contract_type)
                      .map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.is_default ? '(standaard)' : ''}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
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
                  <><Save className="w-4 h-4 mr-2" />Contract Opslaan</>
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
            {selectedContract && (
              <div className="space-y-2">
                <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-slate-700">
                    {selectedContract.contract_number} — {selectedContract.contract_type}
                  </p>
                  <p className="text-slate-500">
                    Je tekent als: <strong>{user?.role === 'admin' ? 'Management' : 'Medewerker'}</strong>
                  </p>
                </div>
                {/* Progress */}
                <div className="flex items-center gap-2 text-xs">
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${selectedContract.employee_signature_url || user?.role !== 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    <UserCheck className="w-3 h-3" /> 1. Medewerker {selectedContract.employee_signature_url ? '✓' : user?.role !== 'admin' ? '(nu)' : ''}
                  </div>
                  <div className="w-4 h-px bg-slate-300" />
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${selectedContract.manager_signature_url || (user?.role === 'admin' && selectedContract.employee_signature_url) ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                    <UserCheck className="w-3 h-3" /> 2. Management {selectedContract.manager_signature_url ? '✓' : (user?.role === 'admin' && selectedContract.employee_signature_url) ? '(nu)' : ''}
                  </div>
                  <div className="w-4 h-px bg-slate-300" />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-400">
                    <CheckCircle className="w-3 h-3" /> 3. Actief
                  </div>
                </div>
              </div>
            )}
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

          {/* Send Error Dialog */}
          <Dialog open={!!sendError} onOpenChange={(open) => !open && setSendError(null)}>
          <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sendError?.type === 'invited' ? (
                <><CheckCircle className="w-5 h-5 text-emerald-600" /> Uitnodiging verstuurd</>
              ) : sendError?.type === 'not_app_user' ? (
                <><AlertTriangle className="w-5 h-5 text-amber-600" /> Medewerker niet geregistreerd</>
              ) : (
                <><XCircle className="w-5 h-5 text-red-600" /> Fout bij verzenden</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{sendError?.message}</p>

            {sendError?.type === 'not_app_user' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">
                  Wil je {sendError.employeeName} uitnodigen als app-gebruiker?
                </p>
                <p className="text-xs text-blue-600">
                  Er wordt een uitnodiging verstuurd naar {sendError.employeeEmail}. 
                  De medewerker krijgt alleen toegang tot de mobiele app en contractondertekening.
                </p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleInviteAndRetry}
                  disabled={invitingEmployee}
                >
                  {invitingEmployee ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uitnodigen...</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" /> Uitnodigen als app-gebruiker</>
                  )}
                </Button>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setSendError(null)}>
              Sluiten
            </Button>
          </div>
          </DialogContent>
          </Dialog>
          </div>
          );
          }