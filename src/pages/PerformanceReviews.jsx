import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, FileText, MessageSquare, Eye, Loader2, TrendingUp, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

export default function PerformanceReviewsPage() {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [activeTab, setActiveTab] = useState("reviews");
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const result = await base44.entities.Employee.filter({ status: "Actief" });
      return result || [];
    }
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const result = await base44.entities.PerformanceReview.list('-review_date', 100);
      return result || [];
    }
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const result = await base44.entities.PerformanceNote.list('-note_date', 100);
      return result || [];
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleAddReview = (employeeId) => {
    setSelectedEmployee(employeeId);
    setSelectedReview(null);
    setShowReviewDialog(true);
  };

  const handleEditReview = (review) => {
    setSelectedReview(review);
    setSelectedEmployee(review.employee_id);
    setShowReviewDialog(true);
  };

  const handleAddNote = (employeeId) => {
    setSelectedEmployee(employeeId);
    setShowNoteDialog(true);
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Onbekend';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Positief': 'bg-green-100 text-green-800',
      'Verbeterpunt': 'bg-yellow-100 text-yellow-800',
      'Incident': 'bg-red-100 text-red-800',
      'Ontwikkeling': 'bg-blue-100 text-blue-800',
      'Overig': 'bg-slate-100 text-slate-800'
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  const filteredNotes = selectedEmployee 
    ? notes?.filter(n => n.employee_id === selectedEmployee)
    : notes;

  const filteredReviews = selectedEmployee
    ? reviews?.filter(r => r.employee_id === selectedEmployee)
    : reviews;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Resultaat & Ontwikkeling</h1>
          <p className="text-slate-600">Beoordelingen en meldingen per medewerker</p>
        </div>

        <div className="mb-6 flex gap-4 items-center flex-wrap">
          <Select value={selectedEmployee || "all"} onValueChange={(val) => setSelectedEmployee(val === "all" ? null : val)}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Filter op medewerker" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle medewerkers</SelectItem>
              {employees?.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            onClick={() => selectedEmployee ? handleAddReview(selectedEmployee) : null}
            disabled={!selectedEmployee}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe beoordeling
          </Button>

          <Button 
            onClick={() => selectedEmployee ? handleAddNote(selectedEmployee) : null}
            disabled={!selectedEmployee}
            variant="outline"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Nieuwe melding
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reviews">
              <FileText className="w-4 h-4 mr-2" />
              Beoordelingen
            </TabsTrigger>
            <TabsTrigger value="notes">
              <MessageSquare className="w-4 h-4 mr-2" />
              Meldingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6">
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredReviews && filteredReviews.length > 0 ? (
              <div className="grid gap-4">
                {filteredReviews.map((review) => (
                  <Card key={review.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleEditReview(review)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-slate-900">
                              {getEmployeeName(review.employee_id)}
                            </h3>
                            <Badge>{review.status}</Badge>
                            {review.trede_verhoging && (
                              <Badge className="bg-green-100 text-green-800">
                                <Award className="w-3 h-3 mr-1" />
                                Trede verhoging
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-3 mb-3">
                            {/* Operationele percentages */}
                            {(review.tvi_dag || review.uitreik_locatie || review.scankwaliteit || review.pba_bezorgen || review.hitrate) && (
                              <div className="bg-slate-50 p-3 rounded-lg">
                                <p className="text-xs font-medium text-slate-700 mb-2">Operationele Resultaten</p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {review.tvi_dag && (
                                    <div>
                                      <p className="text-xs text-slate-500">TVI Dag</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.tvi_dag}%</p>
                                    </div>
                                  )}
                                  {review.uitreik_locatie && (
                                    <div>
                                      <p className="text-xs text-slate-500">Uitreik locatie</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.uitreik_locatie}%</p>
                                    </div>
                                  )}
                                  {review.scankwaliteit && (
                                    <div>
                                      <p className="text-xs text-slate-500">Scankwaliteit</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.scankwaliteit}%</p>
                                    </div>
                                  )}
                                  {review.pba_bezorgen && (
                                    <div>
                                      <p className="text-xs text-slate-500">PBA-bezorgen</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.pba_bezorgen}%</p>
                                    </div>
                                  )}
                                  {review.hitrate && (
                                    <div>
                                      <p className="text-xs text-slate-500">Hitrate</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.hitrate}%</p>
                                    </div>
                                  )}
                                  {review.altijd_op_tijd_depot && (
                                    <div>
                                      <p className="text-xs text-slate-500">Op tijd depot</p>
                                      <p className="text-sm font-semibold text-slate-900">{review.altijd_op_tijd_depot}%</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Scores overzicht */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                              {review.veilig_defensief_rijgedrag && (
                                <div>
                                  <p className="text-xs text-slate-500">Veilig rijgedrag</p>
                                  <p className="text-sm font-semibold text-slate-900">{review.veilig_defensief_rijgedrag}/10</p>
                                </div>
                              )}
                              {review.naleven_verkeersregels && (
                                <div>
                                  <p className="text-xs text-slate-500">Verkeersregels</p>
                                  <p className="text-sm font-semibold text-slate-900">{review.naleven_verkeersregels}/10</p>
                                </div>
                              )}
                              {review.schadevrij_rijden && (
                                <div>
                                  <p className="text-xs text-slate-500">Schadevrij</p>
                                  <p className="text-sm font-semibold text-slate-900">{review.schadevrij_rijden}/10</p>
                                </div>
                              )}
                              {review.persoonlijke_inzet && (
                                <div>
                                  <p className="text-xs text-slate-500">Pers. inzet</p>
                                  <p className="text-sm font-semibold text-slate-900">{review.persoonlijke_inzet}/10</p>
                                </div>
                              )}
                              {review.omgang_collega && (
                                <div>
                                  <p className="text-xs text-slate-500">Omgang collega's</p>
                                  <p className="text-sm font-semibold text-slate-900">{review.omgang_collega}/10</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {review.gemiddelde_score && (
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-slate-700">
                                Gemiddelde score: {review.gemiddelde_score.toFixed(1)}/10
                              </span>
                            </div>
                          )}

                          <p className="text-sm text-slate-600">
                            Beoordeeld op {new Date(review.review_date).toLocaleDateString('nl-NL')}
                            {review.period_start && review.period_end && (
                              <> • Periode: {new Date(review.period_start).toLocaleDateString('nl-NL')} - {new Date(review.period_end).toLocaleDateString('nl-NL')}</>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Geen beoordelingen gevonden</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-6">
            {notesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredNotes && filteredNotes.length > 0 ? (
              <div className="grid gap-4">
                {filteredNotes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">{note.title}</h3>
                            <Badge className={getCategoryColor(note.category)}>{note.category}</Badge>
                            {note.severity !== 'Normaal' && (
                              <Badge variant="outline">{note.severity}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-1">{getEmployeeName(note.employee_id)}</p>
                        </div>
                        {note.follow_up_required && (
                          <Badge className="bg-orange-100 text-orange-800">Follow-up vereist</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-700 mb-3">{note.description}</p>
                      
                      {note.action_taken && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-500 mb-1">Ondernomen actie:</p>
                          <p className="text-sm text-slate-700">{note.action_taken}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{new Date(note.note_date).toLocaleDateString('nl-NL')}</span>
                        {note.created_by_name && <span>Door: {note.created_by_name}</span>}
                        {note.follow_up_date && (
                          <span className="text-orange-600">Follow-up: {new Date(note.follow_up_date).toLocaleDateString('nl-NL')}</span>
                        )}
                        {note.is_visible_to_employee && (
                          <Badge variant="outline" className="text-xs">
                            <Eye className="w-3 h-3 mr-1" />
                            Zichtbaar voor medewerker
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Geen meldingen gevonden</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <ReviewDialog
          open={showReviewDialog}
          onClose={() => setShowReviewDialog(false)}
          employeeId={selectedEmployee}
          employees={employees}
          review={selectedReview}
          user={user}
        />

        <NoteDialog
          open={showNoteDialog}
          onClose={() => setShowNoteDialog(false)}
          employeeId={selectedEmployee}
          employees={employees}
          user={user}
        />
      </div>
    </div>
  );
}

function ReviewDialog({ open, onClose, employeeId, employees, review, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    review_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    tvi_dag: null,
    uitreik_locatie: null,
    scankwaliteit: null,
    pba_bezorgen: null,
    hitrate: null,
    altijd_op_tijd_depot: null,
    veilig_defensief_rijgedrag: 5,
    naleven_verkeersregels: 5,
    schadevrij_rijden: 5,
    melden_schade_incidenten: 5,
    representatief_gebruik_voertuig: 5,
    periodieke_voertuig_controle: 5,
    netheid_onderhoud_voertuig: 5,
    zuinig_verantwoord_rijgedrag: 5,
    bandenslijtage: 5,
    persoonlijke_inzet: 5,
    piek_ziektebezetting: 5,
    omgang_veranderingen: 5,
    ziekteverzuim: 5,
    omgang_collega: 5,
    scholingsbehoeften: '',
    ambitie: '',
    werk_prive_balans: '',
    terugblik_vorige_periode: '',
    nieuwe_doelen: '',
    feedback_medewerker: '',
    trede_verhoging: false,
    trede_verhoging_toelichting: '',
    algemene_conclusie: '',
    ontwikkelpunten: '',
    status: 'Concept'
  });

  React.useEffect(() => {
    if (review) {
      setFormData(review);
    } else if (employeeId) {
      setFormData(prev => ({ ...prev, employee_id: employeeId }));
    }
  }, [review, employeeId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const totalScore = parseFloat(data.veilig_defensief_rijgedrag || 0) +
        parseFloat(data.naleven_verkeersregels || 0) +
        parseFloat(data.schadevrij_rijden || 0) +
        parseFloat(data.melden_schade_incidenten || 0) +
        parseFloat(data.representatief_gebruik_voertuig || 0) +
        parseFloat(data.periodieke_voertuig_controle || 0) +
        parseFloat(data.netheid_onderhoud_voertuig || 0) +
        parseFloat(data.zuinig_verantwoord_rijgedrag || 0) +
        parseFloat(data.bandenslijtage || 0) +
        parseFloat(data.persoonlijke_inzet || 0) +
        parseFloat(data.piek_ziektebezetting || 0) +
        parseFloat(data.omgang_veranderingen || 0) +
        parseFloat(data.ziekteverzuim || 0) +
        parseFloat(data.omgang_collega || 0);
      
      const avg = totalScore / 14;

      const reviewData = {
        ...data,
        gemiddelde_score: avg,
        trede_verhoging: totalScore >= 21 ? data.trede_verhoging : false,
        reviewer_id: user?.id
      };

      if (review) {
        return await base44.entities.PerformanceReview.update(review.id, reviewData);
      } else {
        return await base44.entities.PerformanceReview.create(reviewData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{review ? 'Beoordeling bewerken' : 'Nieuwe beoordeling'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Medewerker</Label>
              <Select value={formData.employee_id} onValueChange={(val) => setFormData({...formData, employee_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Beoordelingsdatum</Label>
              <Input
                type="date"
                value={formData.review_date}
                onChange={(e) => setFormData({...formData, review_date: e.target.value})}
              />
            </div>

            <div>
              <Label>Periode van</Label>
              <Input
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({...formData, period_start: e.target.value})}
              />
            </div>

            <div>
              <Label>Periode tot</Label>
              <Input
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({...formData, period_end: e.target.value})}
              />
            </div>
          </div>

          {/* Categorie 1: Operationele Resultaten (KPI's) */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="text-blue-600">1.</span> Operationele Resultaten (KPI's)
            </h3>
            <p className="text-xs text-slate-500 mb-3">Harde cijfers en efficiëntie van het transportproces</p>
            
            <div className="space-y-4">
              {/* Nieuwe operationele resultaten met percentages */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">TVI Dag (target: 93%)</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.tvi_dag || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.tvi_dag || 0}
                    onChange={(e) => setFormData({...formData, tvi_dag: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Uitreik locatie (target: 98%)</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.uitreik_locatie || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.uitreik_locatie || 0}
                    onChange={(e) => setFormData({...formData, uitreik_locatie: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Scankwaliteit (target: 99,2%)</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.scankwaliteit || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.scankwaliteit || 0}
                    onChange={(e) => setFormData({...formData, scankwaliteit: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">PBA-bezorgen (target: 93%)</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.pba_bezorgen || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.pba_bezorgen || 0}
                    onChange={(e) => setFormData({...formData, pba_bezorgen: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Hitrate (target: 97,9%)</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.hitrate || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.hitrate || 0}
                    onChange={(e) => setFormData({...formData, hitrate: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs">Altijd op tijd op depot</Label>
                    <span className="text-xs font-semibold text-blue-600">{formData.altijd_op_tijd_depot || 0}%</span>
                  </div>
                  <Input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.altijd_op_tijd_depot || 0}
                    onChange={(e) => setFormData({...formData, altijd_op_tijd_depot: parseFloat(e.target.value)})}
                    className="w-full h-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categorie 2: Vaardigheden en Verantwoord Gebruik van het Voertuig */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="text-blue-600">2.</span> Vaardigheden en Verantwoord Gebruik van het Voertuig
            </h3>
            <p className="text-xs text-slate-500 mb-3">Omgang met voertuig, rijstijl en punctualiteit</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Veilig en defensief rijgedrag</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.veilig_defensief_rijgedrag}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.veilig_defensief_rijgedrag}
                  onChange={(e) => setFormData({...formData, veilig_defensief_rijgedrag: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Naleven verkeersregels en bedrijfsrichtlijnen</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.naleven_verkeersregels}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.naleven_verkeersregels}
                  onChange={(e) => setFormData({...formData, naleven_verkeersregels: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Schadevrij rijden / schadehistorie</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.schadevrij_rijden}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.schadevrij_rijden}
                  onChange={(e) => setFormData({...formData, schadevrij_rijden: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Correct en tijdig melden van schade en incidenten</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.melden_schade_incidenten}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.melden_schade_incidenten}
                  onChange={(e) => setFormData({...formData, melden_schade_incidenten: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Representatief gebruik van het voertuig</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.representatief_gebruik_voertuig}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.representatief_gebruik_voertuig}
                  onChange={(e) => setFormData({...formData, representatief_gebruik_voertuig: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Periodieke voertuig controle</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.periodieke_voertuig_controle}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.periodieke_voertuig_controle}
                  onChange={(e) => setFormData({...formData, periodieke_voertuig_controle: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Netheid en onderhoud van het voertuig</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.netheid_onderhoud_voertuig}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.netheid_onderhoud_voertuig}
                  onChange={(e) => setFormData({...formData, netheid_onderhoud_voertuig: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Zuinig en verantwoord rijgedrag</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.zuinig_verantwoord_rijgedrag}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.zuinig_verantwoord_rijgedrag}
                  onChange={(e) => setFormData({...formData, zuinig_verantwoord_rijgedrag: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Bandenslijtage</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.bandenslijtage}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.bandenslijtage}
                  onChange={(e) => setFormData({...formData, bandenslijtage: e.target.value})}
                  className="w-full h-1"
                />
              </div>
            </div>
          </div>

          {/* Categorie 3: Persoonlijke Inzet en Samenwerking */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="text-blue-600">3.</span> Persoonlijke Inzet en Samenwerking
            </h3>
            <p className="text-xs text-slate-500 mb-3">Vaardigheden en gedrag specifiek voor de rol</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Persoonlijke inzet</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.persoonlijke_inzet}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.persoonlijke_inzet}
                  onChange={(e) => setFormData({...formData, persoonlijke_inzet: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Piek- en ziektebezetting</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.piek_ziektebezetting}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.piek_ziektebezetting}
                  onChange={(e) => setFormData({...formData, piek_ziektebezetting: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Stressbestendig</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.omgang_veranderingen}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.omgang_veranderingen}
                  onChange={(e) => setFormData({...formData, omgang_veranderingen: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Ziekteverzuim</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.ziekteverzuim}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.ziekteverzuim}
                  onChange={(e) => setFormData({...formData, ziekteverzuim: e.target.value})}
                  className="w-full h-1"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Omgang collega's</Label>
                  <span className="text-xs font-semibold text-blue-600">{formData.omgang_collega}/10</span>
                </div>
                <Input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.omgang_collega}
                  onChange={(e) => setFormData({...formData, omgang_collega: e.target.value})}
                  className="w-full h-1"
                />
              </div>
            </div>
          </div>

          {/* Categorie 4: Persoonlijke Ontwikkeling (POP) */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="text-blue-600">4.</span> Persoonlijke Ontwikkeling (POP)
            </h3>
            <p className="text-xs text-slate-500 mb-3">Toekomst en groei van de medewerker</p>
            
            <div className="space-y-3">
              <div>
                <Label>Scholingsbehoeften (Code 95, ADR, etc.)</Label>
                <Textarea
                  value={formData.scholingsbehoeften}
                  onChange={(e) => setFormData({...formData, scholingsbehoeften: e.target.value})}
                  rows={2}
                  placeholder="Vereiste verlengingen en aanvullende certificaten..."
                />
              </div>

              <div>
                <Label>Ambitie en doorgroeimogelijkheden</Label>
                <Textarea
                  value={formData.ambitie}
                  onChange={(e) => setFormData({...formData, ambitie: e.target.value})}
                  rows={2}
                  placeholder="Wens om door te groeien naar andere rol..."
                />
              </div>

              <div>
                <Label>Werk-privé balans en duurzame inzetbaarheid</Label>
                <Textarea
                  value={formData.werk_prive_balans}
                  onChange={(e) => setFormData({...formData, werk_prive_balans: e.target.value})}
                  rows={2}
                  placeholder="Fysieke gesteldheid, werkdruk, balans..."
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            {(() => {
              const totalScore = parseFloat(formData.veilig_defensief_rijgedrag || 0) +
                parseFloat(formData.naleven_verkeersregels || 0) +
                parseFloat(formData.schadevrij_rijden || 0) +
                parseFloat(formData.melden_schade_incidenten || 0) +
                parseFloat(formData.representatief_gebruik_voertuig || 0) +
                parseFloat(formData.periodieke_voertuig_controle || 0) +
                parseFloat(formData.netheid_onderhoud_voertuig || 0) +
                parseFloat(formData.zuinig_verantwoord_rijgedrag || 0) +
                parseFloat(formData.bandenslijtage || 0) +
                parseFloat(formData.persoonlijke_inzet || 0) +
                parseFloat(formData.piek_ziektebezetting || 0) +
                parseFloat(formData.omgang_veranderingen || 0) +
                parseFloat(formData.ziekteverzuim || 0) +
                parseFloat(formData.omgang_collega || 0);
              const meetsRequirement = totalScore >= 21;

              return (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.trede_verhoging}
                        onCheckedChange={(checked) => setFormData({...formData, trede_verhoging: checked})}
                        disabled={!meetsRequirement}
                      />
                      <Label className={!meetsRequirement ? 'text-slate-400' : ''}>
                        Komt in aanmerking voor trede verhoging
                      </Label>
                    </div>
                    <Badge className={meetsRequirement ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      Totaal: {totalScore}/140 punten
                    </Badge>
                  </div>
                  {!meetsRequirement && (
                    <p className="text-sm text-red-600">Minimaal 21 punten vereist voor trede verhoging</p>
                  )}
                </div>
              );
            })()}

            {formData.trede_verhoging && (
              <Textarea
                placeholder="Toelichting trede verhoging..."
                value={formData.trede_verhoging_toelichting}
                onChange={(e) => setFormData({...formData, trede_verhoging_toelichting: e.target.value})}
                rows={2}
              />
            )}
          </div>

          {/* Categorie 5: Evaluatie en Afspraken */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <span className="text-blue-600">5.</span> Evaluatie en Afspraken
            </h3>
            <p className="text-xs text-slate-500 mb-3">Concrete samenvatting en doelen</p>
            
            <div className="space-y-3">
              <div>
                <Label>Terugblik op doelen vorige periode</Label>
                <Textarea
                  value={formData.terugblik_vorige_periode}
                  onChange={(e) => setFormData({...formData, terugblik_vorige_periode: e.target.value})}
                  rows={3}
                  placeholder="Evaluatie van de doelen uit de vorige periode..."
                />
              </div>

              <div>
                <Label>Nieuwe doelen (SMART geformuleerd)</Label>
                <Textarea
                  value={formData.nieuwe_doelen}
                  onChange={(e) => setFormData({...formData, nieuwe_doelen: e.target.value})}
                  rows={3}
                  placeholder="SMART doelen voor de komende periode..."
                />
              </div>

              <div>
                <Label>Feedback medewerker op organisatie en planning</Label>
                <Textarea
                  value={formData.feedback_medewerker}
                  onChange={(e) => setFormData({...formData, feedback_medewerker: e.target.value})}
                  rows={3}
                  placeholder="Ruimte voor feedback van medewerker..."
                />
              </div>

              <div>
                <Label>Algemene conclusie</Label>
                <Textarea
                  value={formData.algemene_conclusie}
                  onChange={(e) => setFormData({...formData, algemene_conclusie: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>Ontwikkelpunten</Label>
                <Textarea
                  value={formData.ontwikkelpunten}
                  onChange={(e) => setFormData({...formData, ontwikkelpunten: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concept">Concept</SelectItem>
                    <SelectItem value="Definitief">Definitief</SelectItem>
                    <SelectItem value="Besproken">Besproken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ open, onClose, employeeId, employees, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    employee_id: employeeId || '',
    note_date: new Date().toISOString().split('T')[0],
    category: 'Overig',
    title: '',
    description: '',
    severity: 'Normaal',
    action_taken: '',
    follow_up_required: false,
    follow_up_date: '',
    is_visible_to_employee: false
  });

  React.useEffect(() => {
    if (employeeId) {
      setFormData(prev => ({ ...prev, employee_id: employeeId }));
    }
  }, [employeeId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.PerformanceNote.create({
        ...data,
        created_by_name: user?.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onClose();
      setFormData({
        employee_id: employeeId || '',
        note_date: new Date().toISOString().split('T')[0],
        category: 'Overig',
        title: '',
        description: '',
        severity: 'Normaal',
        action_taken: '',
        follow_up_required: false,
        follow_up_date: '',
        is_visible_to_employee: false
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nieuwe melding</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Medewerker</Label>
              <Select value={formData.employee_id} onValueChange={(val) => setFormData({...formData, employee_id: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Datum</Label>
              <Input
                type="date"
                value={formData.note_date}
                onChange={(e) => setFormData({...formData, note_date: e.target.value})}
              />
            </div>

            <div>
              <Label>Categorie</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Positief">Positief</SelectItem>
                  <SelectItem value="Verbeterpunt">Verbeterpunt</SelectItem>
                  <SelectItem value="Incident">Incident</SelectItem>
                  <SelectItem value="Ontwikkeling">Ontwikkeling</SelectItem>
                  <SelectItem value="Overig">Overig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ernst</Label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({...formData, severity: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laag">Laag</SelectItem>
                  <SelectItem value="Normaal">Normaal</SelectItem>
                  <SelectItem value="Hoog">Hoog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Titel</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <Label>Omschrijving</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              required
            />
          </div>

          <div>
            <Label>Ondernomen actie</Label>
            <Textarea
              value={formData.action_taken}
              onChange={(e) => setFormData({...formData, action_taken: e.target.value})}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.follow_up_required}
                onCheckedChange={(checked) => setFormData({...formData, follow_up_required: checked})}
              />
              <Label>Follow-up vereist</Label>
            </div>

            {formData.follow_up_required && (
              <div>
                <Label>Follow-up datum</Label>
                <Input
                  type="date"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.is_visible_to_employee}
                onCheckedChange={(checked) => setFormData({...formData, is_visible_to_employee: checked})}
              />
              <Label>Zichtbaar voor medewerker</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}