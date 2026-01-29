import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  BookOpen,
  Percent,
  Euro,
  Clock,
  Calendar,
  Trash2,
  Edit,
  Users,
  Calculator
} from "lucide-react";

const ruleTypes = ["Toeslag", "Vergoeding", "Werktijd", "Pauze", "Overig"];

export default function CaoRules() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['caoRules'],
    queryFn: () => base44.entities.CaoRule.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CaoRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
      setIsDialogOpen(false);
      setSelectedRule(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CaoRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
      setIsDialogOpen(false);
      setSelectedRule(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CaoRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caoRules'] });
    }
  });

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rule_type: "Toeslag",
    percentage: "",
    fixed_amount: "",
    start_time: "",
    end_time: "",
    applies_to_days: [],
    start_date: "",
    end_date: "",
    status: "Actief"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      rule_type: "Toeslag",
      percentage: "",
      fixed_amount: "",
      start_time: "",
      end_time: "",
      applies_to_days: [],
      start_date: "",
      end_date: "",
      status: "Actief"
    });
  };

  const openEditDialog = (rule) => {
    setSelectedRule(rule);
    setFormData({
      ...rule,
      applies_to_days: rule.applies_to_days || [],
      percentage: rule.percentage || "",
      fixed_amount: rule.fixed_amount || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setSelectedRule(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      percentage: formData.percentage ? Number(formData.percentage) : null,
      fixed_amount: formData.fixed_amount ? Number(formData.fixed_amount) : null
    };

    if (selectedRule) {
      updateMutation.mutate({ id: selectedRule.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const days = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

  const toggleDay = (day) => {
    const current = formData.applies_to_days || [];
    if (current.includes(day)) {
      setFormData({ ...formData, applies_to_days: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, applies_to_days: [...current, day] });
    }
  };

  const getRuleTypeColor = (type) => {
    switch (type) {
      case "Toeslag": return "bg-purple-100 text-purple-700";
      case "Vergoeding": return "bg-emerald-100 text-emerald-700";
      case "Werktijd": return "bg-blue-100 text-blue-700";
      case "Pauze": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const groupedRules = ruleTypes.reduce((acc, type) => {
    acc[type] = rules.filter(r => r.rule_type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CAO-regels</h1>
          <p className="text-slate-500 mt-1">Beroepsgoederenvervoer regelgeving</p>
        </div>
        <Button onClick={openNewDialog} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe Regel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="regels" className="flex gap-6">
        <TabsList className="flex-col h-fit items-stretch w-64">
          <TabsTrigger value="regels" className="gap-2 justify-start">
            <BookOpen className="w-4 h-4" />
            CAO Regels
          </TabsTrigger>
          <TabsTrigger value="deeltijd" className="justify-start">
            Artikel 8 Deeltijdwerknemers
          </TabsTrigger>
          <TabsTrigger value="oproep" className="justify-start">
            Artikel 10 Oproepkrachten
          </TabsTrigger>
          <TabsTrigger value="berekening" className="justify-start">
            Artikel 12 Berekening dag- en uurloon
          </TabsTrigger>
          <TabsTrigger value="loonbetaling" className="justify-start">
            Artikel 13 Loonbetaling
          </TabsTrigger>
          <TabsTrigger value="arbeidsongeschiktheid" className="justify-start">
            Artikel 16 Loon bij arbeidsongeschiktheid
          </TabsTrigger>
          <TabsTrigger value="functie-indeling" className="justify-start">
            Artikel 18 Functie-indeling
          </TabsTrigger>
          <TabsTrigger value="inschaling" className="justify-start">
            Artikel 19 Inschaling bij indiensttreding
          </TabsTrigger>
          <TabsTrigger value="jonge-werknemers" className="justify-start">
            Artikel 22 Mintrede-niet vakbekwaam
          </TabsTrigger>
          <TabsTrigger value="loonberekening" className="justify-start">
            Artikel 26a Loonberekening
          </TabsTrigger>
          <TabsTrigger value="overuren" className="justify-start">
            Artikel 27 Definities overuren
          </TabsTrigger>
          <TabsTrigger value="verplichting-overwerk" className="justify-start">
            Artikel 28a Verplichting overwerk jonger dan 55 jaar
          </TabsTrigger>
          <TabsTrigger value="verplichting-overwerk-oudere" className="justify-start">
            Artikel 28b Verplichting overwerk oudere werknemers
          </TabsTrigger>
          <TabsTrigger value="vergoeding-overuren" className="justify-start">
            Artikel 29 Vergoeding overuren
          </TabsTrigger>
          <TabsTrigger value="zon-feestdagen" className="justify-start">
            Artikel 32 Zon- en feestdagen
          </TabsTrigger>
          <TabsTrigger value="vergoeding-diensturen" className="justify-start">
            Artikel 33 Vergoeding diensturen op zaterdag, zondag en feestdagen
          </TabsTrigger>
          <TabsTrigger value="vrije-weekeinden" className="justify-start">
            Artikel 34 Vrije weekeinden
          </TabsTrigger>
          <TabsTrigger value="dienstrooster" className="justify-start">
            Artikel 35 Dienstrooster
          </TabsTrigger>
          <TabsTrigger value="toeslag-nachtelijke-uren" className="justify-start">
            Artikel 37 Toeslag nachtelijke uren
          </TabsTrigger>
          <TabsTrigger value="reiskosten-woon-werk" className="justify-start">
            Artikel 39a Vergoeding reiskosten woon-werkverkeer
          </TabsTrigger>
          <TabsTrigger value="verblijfkosten" className="justify-start">
            Artikel 40 Vergoeding van verblijfkosten
          </TabsTrigger>
          <TabsTrigger value="consignatievergoeding" className="justify-start">
            Artikel 42 Consignatievergoeding
          </TabsTrigger>
          <TabsTrigger value="scholing-algemeen" className="justify-start">
            Artikel 43 Scholing algemeen
          </TabsTrigger>
          <TabsTrigger value="vergoeding-certificaten" className="justify-start">
            Artikel 44 Vergoeding certificaten
          </TabsTrigger>
          <TabsTrigger value="studiekostenregeling" className="justify-start">
            Artikel 45 Studiekostenregeling
          </TabsTrigger>
          <TabsTrigger value="afwezigheid-met-loon" className="justify-start">
            Artikel 64 Afwezigheid met behoud van loon
          </TabsTrigger>
          <TabsTrigger value="bijzonder-verlof" className="justify-start">
            Artikel 65 Bijzonder verlof
          </TabsTrigger>
          <TabsTrigger value="bijzonder-verlof-zonder-loon" className="justify-start">
            Artikel 66 Bijzonder verlof zonder behoud van loon
          </TabsTrigger>
          <TabsTrigger value="vakantie" className="justify-start">
            Artikel 67a Vakantie
          </TabsTrigger>
        </TabsList>
        
        <div className="flex-1">

        {/* CAO Regels Tab */}
        <TabsContent value="regels" className="space-y-6 m-0">

      {/* Rules by Type */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {ruleTypes.map(type => {
            const typeRules = groupedRules[type] || [];
            if (typeRules.length === 0) return null;

            return (
              <Card key={type}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={getRuleTypeColor(type)}>{type}</Badge>
                    <span className="text-slate-500 text-sm font-normal">
                      ({typeRules.length} regels)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {typeRules.map(rule => (
                      <div 
                        key={rule.id}
                        className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => openEditDialog(rule)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{rule.name}</h3>
                              <Badge variant={rule.status === 'Actief' ? 'success' : 'secondary'}>
                                {rule.status}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-slate-500 mt-1">{rule.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                              {rule.percentage && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Percent className="w-4 h-4 text-slate-400" />
                                  {rule.percentage}%
                                </span>
                              )}
                              {rule.fixed_amount && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Euro className="w-4 h-4 text-slate-400" />
                                  €{rule.fixed_amount.toFixed(2)}
                                </span>
                              )}
                              {rule.start_time && rule.end_time && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  {rule.start_time} - {rule.end_time}
                                </span>
                              )}
                              {rule.applies_to_days?.length > 0 && (
                                <span className="flex items-center gap-1 text-slate-600">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  {rule.applies_to_days.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4 text-slate-400" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {rules.length === 0 && (
            <Card className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nog geen CAO-regels</h3>
              <p className="text-slate-500 mt-1">Voeg CAO-regels toe om toeslagen en vergoedingen te berekenen.</p>
            </Card>
          )}
        </div>
      )}
        </TabsContent>

        {/* Deeltijdwerknemers Tab */}
        <TabsContent value="deeltijd" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 8 Deeltijdwerknemers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-slate-700 font-medium mb-2">
                  <strong>1.</strong> De bepalingen van de CAO zijn op deeltijdwerknemers van toepassing, met inachtneming van de volgende leden van dit artikel.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>2.a.</strong> Voor zover de bepalingen van de CAO zich daarvoor lenen, worden zij op de deeltijdwerker naar evenredigheid toegepast. Onafhankelijk van het arbeidspatroon dient voor ieder dienstuur minimaal het wettelijk minimum uurloon te worden betaald.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>2.b.</strong> Overuren zijn uren, liggend op maandag tot en met vrijdag, waarmee de diensttijd van 40 uur in de week, dan wel de individueel overeengekomen arbeidstijd als dit minder is dan 40 uur per week, wordt overschreden Voor rijdend personeel op dubbel bemande voertuigen geldt de vorige zin voor de uren liggend op maandag tot en met zaterdag 7.00 uur.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>3.a.</strong> De vakantie-aanspraken en vakantiebijslag ontstaan naar rato van het aantal verrichte diensturen, doch niet meer dan het voor betrokkenen geldende maximum genoemd in artikel 67a, artikel 68 resp. artikel 69.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>3.b.</strong> Voor het vaststellen van de onder 3a. genoemde vakantie-aanspraken en vakantiebijslag geldt als basis voor de berekening, het minimum aantal overeengekomen uren.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>3.c.</strong> Voor het berekenen van de vakantie-aanspraken en vakantiebijslag in een bepaald jaar, dient het totaal aantal verrichte diensturen, met een minimum van het aantal overeengekomen uren, in het voorafgaande kalenderjaar te worden genomen.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oproepkrachten Tab */}
        <TabsContent value="oproep" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 10 Oproepkrachten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-slate-700 font-medium mb-3">
                  <strong>1.</strong> Voor oproepkrachten gelden in beginsel alle artikelen van deze CAO, met uitzondering van:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>artikel 4</li>
                  <li>artikel 6 lid 2</li>
                  <li>artikel 13</li>
                  <li>artikel 14</li>
                  <li>artikel 26b en c</li>
                  <li>artikel 30</li>
                  <li>artikel 31</li>
                  <li>artikel 36</li>
                  <li>artikel 64 t/m 69</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Voor de berekening van het dag- en uurloon moet voor de oproepkracht worden uitgegaan van het functieloon vermeerderd met 8% vakantiebijslag.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> De oproepkracht verwerft wettelijke vakantiedagen overeenkomstig artikel 7:634 BW over de uren die worden gewerkt.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> De oproepkracht wordt per uur beloond.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>5.</strong> Overuren zijn de uren, waarmee de diensttijd van gemiddeld 8 uur per dag wordt overschreden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>6.</strong> In afwijking van artikel 6 lid 3 wordt door de werkgever aan de oproepkracht een exemplaar van de CAO verstrekt indien hij dit aan de werkgever verzoekt.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Berekening dag- en uurloon Tab */}
        <TabsContent value="berekening" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 12 Berekening dag- en uurloon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-6 rounded-lg">
                <p className="text-slate-700 leading-relaxed">
                  Het dag- en uurloon wordt berekend door het functieloon per 4 weken te delen door 20 respectievelijk 160 en het functieloon per maand te delen door 21,75 respectievelijk 173,92.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loonbetaling Tab */}
        <TabsContent value="loonbetaling" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 13 Loonbetaling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> De in artikel 25 genoemde functielonen worden per 4 weken of per maand betaald.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Het omrekeningsgetal voor de herleiding van vierweken- naar maandloon is 1,087.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> De uitbetaling van de overuren dient uiterlijk in de betalingsperiode volgend op de betalingsperiode waarin de overuren zijn ontstaan te geschieden.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loon bij arbeidsongeschiktheid Tab */}
        <TabsContent value="arbeidsongeschiktheid" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 16 Loon bij arbeidsongeschiktheid</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-slate-700 mb-2">
                  <strong>1.</strong> Het loon bij ziekte ingevolge artikel 7: 629 BW bestaat uit:
                </p>
                <div className="ml-4 space-y-2">
                  <p className="text-slate-700">
                    <strong>a)</strong> het functieloon;
                  </p>
                  <p className="text-slate-700">
                    <strong>b)</strong> de persoonlijke toeslag als bedoeld in artikel 23;
                  </p>
                  <p className="text-slate-700">
                    <strong>c)</strong> het bedrag dat de werknemer gemiddeld gedurende de periode van 52 weken voorafgaande aan de eerste dag van arbeidsongeschiktheid heeft ontvangen aan ploegendienst- en vuilwerktoeslag, de onregelmatigheidstoeslag van artikel 4 van Bijlage VII en de toeslag voor nachtelijke uren van artikel 37;
                  </p>
                  <p className="text-slate-700">
                    <strong>D)</strong> het bedrag dat de werknemer gemiddeld gedurende de periode van 52 weken voorafgaande aan de eerste dag van arbeidsongeschiktheid heeft ontvangen(*) aan overuren, en aan zaterdag- en zondaguren voor zover deze de individueel overeengekomen arbeidstijd per week overschrijden en de toeslagen van 50% en 100% over deze uren. Het gemiddelde aantal overuren kan niet hoger zijn dan 37,5% (**) van de individueel overeengekomen arbeidstijd per week en het totale bedrag van dit onderdeel kan niet meer bedragen dan 48,75% van het functieloon. Indien er geen sprake is van een bedrijfsongeval, worden voorts de volgende verminderingen op dit bedrag toegepast: allereerst wordt er een kwart van het gemiddelde aantal overuren afgetrokken. Vervolgens kan het bedrag niet meer bedragen dan 22,75% van het functieloon (zijnde de waarde van 7 overuren à 130% bij een dienstverband van 40 uur per week).
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 italic">
                  (*) Overgangsbepaling voor deeltijdwerknemers: indien de eerste dag van arbeidsongeschiktheid in 2026 valt, wordt bij het vaststellen van het gedeelte van het bedrag voor de voorafgaande 52 weken dat in 2025 ligt, gerekend met de nieuwe definitie van overwerk uit deze CAO.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 italic">
                  (**)Toelichting: de 37,5% komt neer op maximaal 15 overuren voor een dienstverband van 40 uur per week. Voor een deeltijdwerknemer met een dienstverband van 20 uur per week komt dit neer op 7,5 overuren.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Indien de werknemer arbeidsongeschikt is, ontvangt hij een aanvulling op de wettelijke loondoorbetalingsverplichting van artikel 7: 629 BW tot 100%, zoals hieronder beschreven. Deze aanvulling vindt plaats tot ten hoogste het maximum loon als bedoeld in artikel 17 Wfsv.
                </p>
              </div>

              <div>
                <p className="text-slate-700 font-semibold mb-2">
                  De aanvullingsverplichting geldt niet in de volgende gevallen:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>indien er ingevolge de wet geen loondoorbetalingsverplichting is;</li>
                  <li>indien de arbeidsongeschiktheid door de schuld of toedoen van de werknemer is veroorzaakt.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> De aanvullingsverplichting vangt aan op de eerste dag van de arbeidsongeschiktheid. De maximale duur van de aanvulling is 52 weken, of, bij een dienstverband dat op de eerste dag van arbeidsongeschiktheid korter dan een jaar heeft geduurd, maximaal 13 weken. Indien de werknemer zich nog in de proeftijd bevindt op de eerste dag van arbeidsongeschiktheid, eindigt de aanvulling na 2 weken.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> De duur van de aanvulling wordt in geval van een dienstverband dat op de eerste dag van arbeidsongeschiktheid langer dan een jaar heeft geduurd, verlengd met een tweede periode van 52 weken, indien de werknemer meewerkt aan zijn reïntegratie en tevens een aanvullende zorgverzekering heeft afgesloten waarin in ieder geval is opgenomen een vergoeding voor fysiotherapie, psychologische hulp (tenzij deze in het basispakket is opgenomen) en de diëtist. De aanvulling wordt ook verlengd tot 104 weken indien de werknemer blijvend volledig arbeidsongeschikt is.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg italic">
                <p className="text-slate-700">
                  * Voor uitleg ten aanzien van de berekeningswijze zie Bijlage VI
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>5.</strong> Perioden van arbeidsongeschiktheid die geheel of gedeeltelijk binnen één kalenderjaar vallen, worden samengeteld voor de bepaling van de duur van de aanvullingsverplichting, voor zover de arbeidsongeschiktheid niet het gevolg is van een ongeval.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>6.</strong> Tussentijdse wijzigingen van het brutoloon, resp. dagloonbesluiten of andere wettelijke maatregelen dienen in deze loonbetaling bij arbeidsongeschiktheid te worden verwerkt.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.</strong> In het geval de werknemer een uitkering toekomt krachtens de ziektewet, WAO/WIA of krachtens een verzekering of enig fonds, waarin de deelneming is bedongen bij of voortvloeit uit de arbeidsovereenkomst, wordt de loonbetaling met deze uitkering verminderd.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Functie-indeling Tab */}
        <TabsContent value="functie-indeling" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 18 Functie-indeling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Aan de hand van het tussen partijen overeengekomen systeem van functiewaardering vindt functie-indeling plaats. De FUWA heeft in opdracht van partijen de taak om referentiefuncties te beheren en te publiceren. Deze set van referentiefuncties (Functiehandboek) is gepubliceerd op de website van STL:{' '}
                  <a href="https://www.stl.nl/werknemers/salaris-en-waardering/boek-functietyperingen/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://www.stl.nl/werknemers/salaris-en-waardering/boek-functietyperingen/
                  </a>
                  {' '}en{' '}
                  <a href="https://www.stl.nl/werkgevers/cao-en-functiewaardering/functietypering/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    https://www.stl.nl/werkgevers/cao-en-functiewaardering/functietypering/
                  </a>
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Voor werknemers, die geplaatst zijn in een hogere functie dan genoemd in loonschaal H dient door de werkgever de functie en het loon schriftelijk vastgesteld te worden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> Er is een Sectorinstituut Transport en Logistiek, Postbus 308, 2800 AH Gouda, tel.nr. 088-2596111. Dit sectorinstituut heeft onder meer als taak het bevorderen van de indeling van functies in het Beroepsgoederenvervoer over de weg en de verhuur van mobiele kranen overeenkomstig het afgesproken systeem van functiewaardering.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inschaling bij indiensttreding Tab */}
        <TabsContent value="inschaling" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 19 Inschaling bij indiensttreding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Bij indiensttreding wordt de werknemer ingeschaald in de bij zijn functie behorende loonschaal op de trede die overeenkomt met het aantal onafgebroken ervaringsjaren in dezelfde of soortgelijke functie, zowel in deze als in andere bedrijfstakken, direct voorafgaande aan de indiensttreding. Bij de vaststelling van het aantal ervaringsjaren blijven onderbrekingen van minder dan twee jaar buiten beschouwing.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Indien de ervaring niet is verworven in eenzelfde, maar in een soortgelijke functie, kan de werknemer vanaf de indiensttreding gedurende maximaal 1 jaar in de juiste loonschaal een trede lager worden geplaatst dan overeenkomt met zijn ervaringsjaren in die soortgelijke functie. Na dat jaar wordt de werknemer geplaatst op die trede die overeenkomt met zijn ervaringsjaren.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> Bij de indiensttreding kan de werkgever bepalen dat de werknemer tijdens de proeftijd op een lagere trede in de juiste loonschaal wordt ingedeeld. Met terugwerkende kracht tot de datum van indiensttreding wordt de werknemer na afloop van de proeftijd ingedeeld op de trede, die overeenkomt met het aantal ervaringsjaren, zoals vastgesteld overeenkomstig lid 1 van dit artikel.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 21 jarigen en ouder/ vakbekwame chauffeurs Tab */}
        <TabsContent value="jonge-werknemers" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 22 21 jarigen en ouder/ vakbekwame chauffeurs en kraanmachinisten jonger dan 21 jaar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.a.</strong> Indien een werknemer de leeftijd van 21 jaar bereikt, wordt hij ingeschaald op trede 1 van de geldende loonschaal.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.b.</strong> In afwijking van lid 1a. wordt de werknemer, jonger dan 21 jaar, zodra deze in het bezit is van een geldig getuigschrift van vakbekwaamheid voor het besturen van een vrachtauto (code 95) en/of het wettelijk verplicht TCVT- RA-registratie van vakbekwaamheid voor het bedienen van een mobiele kraan ingeschaald op trede 1 van de geldende loonschaal mits de werknemer in zijn dagelijkse werkzaamheden ook daadwerkelijk een vrachtauto moet besturen en/of een mobiele kraan moet bedienen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.c.</strong> In afwijking van lid 1a geldt dat de werknemer die de leeftijd van 21 jaar heeft bereikt, maar bij indiensttreding nog niet beschikt over de specifieke vak- en/of bedrijfskennis welke voor de vervulling van de functies vallende onder de loonschalen A, B en C is vereist, kan worden ingedeeld in de trede –1 behorende bij zijn loonschaal. De -1 trede wordt berekend op basis van het wettelijk minimumloon en trede 1 van de loonschaal en wordt bepaald op het gemiddelde van het uur- en weekloon van deze 2 niveaus. Bij een aanpassing van het wettelijk minimumloon en/of trede 1 van een loonschaal dient de -1 trede hierop ook te worden aangepast.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.d.</strong> De werkgever stelt de in lid c bedoelde werknemer in de gelegenheid de voor de functie noodzakelijke opleiding/training te volgen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.e.</strong> Zodra de in lid d bedoelde opleiding/training met goed gevolg is afgerond wordt de werknemer in de trede 1 van zijn loonschaal ingedeeld.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.f.</strong> Voor de toekenning van tredeverhogingen is overigens artikel 21 integraal van toepassing.
                </p>
              </div>

              <div className="mt-6">
                <p className="text-slate-700 font-semibold mb-4">De mintreden bedragen per 1 januari 2026:</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-4 py-2 text-left font-semibold text-slate-700">Loonschaal / trede</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">Per week (€)</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">4 weken (€)</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">Per maand (€)</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">Uurloon 100% (€)</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">Uurloon 130% (€)</th>
                        <th className="border border-slate-300 px-4 py-2 text-right font-semibold text-slate-700">Uurloon 150% (€)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 px-4 py-2 font-medium text-slate-700">A-1</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">588,40</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.353,60</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.559,54</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">14,71</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">19,12</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">22,07</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="border border-slate-300 px-4 py-2 font-medium text-slate-700">B-1</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">593,76</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.375,04</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.581,67</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">14,84</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">19,29</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">22,26</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-4 py-2 font-medium text-slate-700">C-1</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">606,74</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.426,96</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">2.638,11</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">15,17</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">19,72</td>
                        <td className="border border-slate-300 px-4 py-2 text-right text-slate-700">22,76</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loonberekening Tab */}
        <TabsContent value="loonberekening" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 26a Loonberekening</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.a.</strong> De functionlonen gelden voor 160 diensturen per periode van 4 weken, respectievelijk 173,92 diensturen per maand.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.b.</strong> Het bepaalde onder a. laat onverlet dat uitbetaling aan de werknemer van minimaal 40 uur per week gegarandeerd is.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-3">
                  <strong>2.a.</strong> Alle diensturen worden uitbetaald onder aftrek van de pauzetijden conform de staffel welke is opgenomen in bijlage III en onder aftrek van de aaneengesloten rust, met als minimum de in de EG-Verordening 561/2006 voorgeschreven rusttijden (zie bijlage III).
                </p>
                <p className="text-slate-700">
                  Bij boot- en treinuren gemaakt in een periode van 24 uur mag maximaal 11 uur aan aaneengesloten rust worden genoteerd met inachtneming van de staffel van de pauzetijden conform bijlage III.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.b.</strong> De diensturen moeten door de werknemer worden geregistreerd op een door de werkgever te verstrekken urenverantwoordingsstaat. Een registratieplicht geldt eveneens voor de uren besteed aan rust, pauzes en de correcties.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-3">
                  <strong>2.c.</strong> De urenverantwoordingsstaat dient minimaal de navolgende gegevens te bevatten:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>de datum</li>
                  <li>de begin- en eindtijd van de dienstitijd en de dag totalen daarvan</li>
                  <li>de rusttijd</li>
                  <li>de pauzes</li>
                  <li>correcties</li>
                  <li>de naam en handtekening van de chauffeur</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.d.</strong> De werknemer ontvangt na controle door de werkgever een voor akkoord getekend exemplaar van de urenverantwoordingsstaat terug.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.e.</strong> De werknemer dient binnen drie maanden na ontvangst van de urenverantwoordingsstaat als bedoeld onder schriftelijk aan de werkgever eventuele bezwaren kenbaar te maken. Wanneer de werknemer van dat recht geen gebruik maakt, geldt de urenverantwoordingsstaat vanaf dat moment als bewijs.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.f.</strong> De werkgever dient de ingevulde urenverantwoordingsstaat gedurende tenminste een jaar na de datum waarop de invulling betrekking had, te bewaren.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.g.</strong> Voor de controle van de urenverantwoordingsstaten dienen de daarbij behorende gegevens te worden overgelegd.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.h.</strong> Bij het gebruik van elektronische tijdregistratiesystemen zijn werkgever en werknemer vrijgesteld van de verplichtingen zoals vermeld onder 2b t/m 2g. Na afloop van elke rit dient de werknemer de beschikking te krijgen over een ongeschoonde uitdraai van de in 2c. genoemde gegevens. De werkgever is tevens verplicht de werknemer éénmaal per betalingsperiode, elektronisch of op andere wijze, een geschoonde uitdraai van de boordcomputer te verstrekken waarop de gegevens staan vermeld overeenkomstig de in lid 2c. genoemde gegevens.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.i.</strong> Indien de werknemer daarom verzoekt, verstrekt de werkgever een schriftelijke toelichting op de correcties van zijn diensturen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.a.</strong> De werkgever kan de normale duur van de werkzaamheden normeren op basis van sociaal en economisch verantwoorde praktijkervaringen en de loonberekeningen daarop baseren. De werkgever dient daarvoor echter eerst de instemming van de werknemers- en werkgeversorganisaties na voorafgaand overleg met de ondernemingsraad of personeelsvertegenwoordiging te verkrijgen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.b.</strong> Het bepaalde onder 3.a. is onverkort van kracht ingeval in de onderneming de diensturen worden betaald met behulp van elektronische tijdregistratiesystemen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.c.</strong> Indien de omstandigheden die aan een normeringsregeling ten grondslag liggen zich wijzigen, dan dient de regeling opnieuw beoordeeld en zodanig aangepast te worden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.d.</strong> Een normeringsregeling ontheft de werknemer niet van de invulling en indiening van de urenverantwoordingsstaat.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.e.</strong> In alle gevallen zal de normeringsregeling schriftelijk worden vastgelegd en binnen 2 weken na dagtekening, ter registratie worden gemeld bij het secretariaat van CAO-partijen, Postbus 3008, 2700 KS Zoetermeer.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.a.</strong> Op werkzaamheden als rijden, laden, lossen en wachttijd kan, in geval van dubbele bemanning, normering plaatsvinden, met dien verstande dat de totale beloning van alle gemaakte diensturen tussen de 85% en de 100% bedraagt. Er is sprake van dubbele bemanning bij internationale ritten als een rit wordt verricht door tenminste 2 chauffeurs met gelijkwaardige werkzaamheden, zowel qua functie-inhoud als qua tijdsbesteding.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.b.</strong> Om van bovenstaande regeling gebruik te kunnen maken, dienen de ondernemingen hun bestaande beloningsbeleid voor dubbelbemande ritten voor 1 mei 2006, bij CAO-partijen te hebben gemeld. Ondernemingen die hun bestaande beloningsbeleid voor de dubbelbemande ritten niet voor 1 mei 2006 hebben gemeld, worden geacht geen normering toe te passen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-3">
                  <strong>4.c.</strong> Ondernemingen die na 1 mei 2006 een nieuw beloningsbeleid voor dubbelbemande ritten willen invoeren, dienen dat met de vakbonden overeen te komen.
                </p>
                <p className="text-slate-700 font-medium mb-2">
                  Daarbij dient het volgende in acht te worden genomen:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>de totale beloning van alle gemaakte diensturen zal uiterlijk na verloop van twee jaar 85% bedragen tenzij de onderneming een hogere beloning overeenkomt met vakbonden;</li>
                  <li>er dient met de vakbonden overleg te worden gevoerd over een afbouwregeling voor het verschil tussen de oude en de nieuwe regeling voor het reeds in dienst zijnde personeel. Deze afbouwregeling komt na 2 jaar te vervallen;</li>
                  <li>voor werknemers die op het moment van inwerkingtreding van de CAO 55 jaar en ouder zijn, blijft de oude regeling gehandhaafd en vindt er geen afbouw plaats;</li>
                  <li>de nieuwe regeling dient te worden gemeld bij CAO-partijen.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Definities overuren Tab */}
        <TabsContent value="overuren" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 27 Definities overuren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Overuren zijn uren, liggend op maandag tot en met vrijdag, waarmee de diensttijd van 40 uur in de week, dan wel de individueel overeengekomen arbeidstijd als dit minder is dan 40 uur per week, wordt overschreden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Voor rijdend personeel op dubbelbemande voertuigen geldt lid 1 voor de uren liggend op maandag tot en met zaterdag 7.00 uur.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verplichting overwerk jonger dan 55 jaar Tab */}
        <TabsContent value="verplichting-overwerk" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 28a Verplichting overwerk jonger dan 55 jaar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Werknemers krijgen het recht om overwerk boven gemiddeld 50 uur per week te weigeren. Dit gemiddelde wordt bezien over een periode van 4 weken. Als werknemer hiervan gebruik wenst te maken dient hij dit éénmalig uiterlijk 4 weken voorafgaand aan het ingaande kwartaal aan te geven.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verplichting overwerk oudere werknemers Tab */}
        <TabsContent value="verplichting-overwerk-oudere" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 28b Verplichting overwerk oudere werknemers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Werknemers van 55 jaar en ouder kunnen niet verplicht worden tot het maken van overuren. De werknemer dient aan het begin van elk kalenderjaar aan te geven indien hij gebruik wenst te maken van deze uitzonderingsregeling. Werkgever en werknemer zullen in onderling overleg bepalen of hieraan uitvoering kan worden gegeven. Bestaande afspraken gemaakt met werknemers die voorheen onder de CAO Goederenvervoer Nederland vielen, worden gerespecteerd.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vergoeding overuren Tab */}
        <TabsContent value="vergoeding-overuren" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 29 Vergoeding overuren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Overuren worden afgerond op halve uren, waarbij overwerk van minder dan 15 minuten niet voor vergoeding in aanmerking komt. Bij gebruik van een boordcomputer worden overuren niet afgerond.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-3">
                  <strong>2.</strong> De bepalingen inzake de vergoeding van overuren worden niet toegepast ten aanzien van:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-slate-700">
                  <li>werknemers die volgens schriftelijke afspraak bevoegd zijn aan andere werknemers op te dragen overwerk te verrichten;</li>
                  <li>de overuren, die een gevolg zijn van vertraging in het transport, tenzij deze vertraging ontstaan is buiten de schuld of toedoen van de werknemer en deze langer dan 15 minuten heeft geduurd;</li>
                  <li>de overuren, die ontstaan zijn door eigen schuld of toedoen van de werknemer.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> Overuren worden – met inachtneming van artikel 30 – vergoed door het uurloon vermeerderd met een toeslag van 30%.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> In afwijking van het bepaalde in lid 3 geldt voor administratief en technisch personeel voor de vergoeding van overuren op roostervrije dagen een toeslag van 100% en voor uren op zondag waarop volgens dienstrooster arbeid wordt verricht 30%.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zon- en feestdagen Tab */}
        <TabsContent value="zon-feestdagen" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 32 Zon- en feestdagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Op zondagen alsmede op algemeen erkende christelijke en nationale feestdagen wordt geen arbeid verricht, tenzij de aard of het belang van de onderneming zulks vordert.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Algemeen erkende christelijke feestdagen zijn: Nieuwjaarsdag, 2e Paasdag, Hemelvaartsdag, 2e Pinksterdag en beide Kerstdagen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Nationale feestdagen zijn: Koningsdag en de dagen, waarop krachtens aanwijzing van de overheid extra vrijaf met behoud van loon mag worden verleend. 5 Mei wordt om de vijf jaar aangewezen als nationale feestdag (indien de jaartelling eindigt op een 0 of een 5).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Als Koningsdag wordt beschouwd de dag waarop, conform Koninklijk Besluit, het feest wordt gevierd.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vergoeding diensturen op zaterdag, zondag en feestdagen Tab */}
        <TabsContent value="vergoeding-diensturen" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 33 Vergoeding diensturen op zaterdag, zondag en feestdagen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Alle diensturen op zaterdag worden vergoed door betaling van het uurloon vermeerderd met een toeslag van 50%.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> In afwijking van lid 1 worden voor rijdend personeel op dubbelbemande voertuigen alle diensturen op zaterdag na 07.00 uur vergoed door betaling van het uurloon vermeerderd met een toeslag van 50%.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> Indien een feestdag als bedoeld in artikel 32 op een zaterdag valt, worden de diensturen in afwijking van lid 1 vergoed overeenkomstig lid 6 van dit artikel.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> In geval Koningsdag op een zaterdag wordt gevierd, zal in afwijking van het bepaalde in de leden 1 en 2 van dit artikel, het werken op deze dag worden vergoed door betaling van een toeslag van 100%.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>5.</strong> Alle diensturen op zondag worden vergoed door betaling van een toeslag van 100% op het uurloon.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-3">
                  <strong>6.</strong> Aan de werknemer, die op een feestdag als bedoeld in artikel 32 – niet vallend op een zondag – arbeid verricht, worden de diensturen vergoed. Als extra vergoeding kan de werknemer kiezen tussen:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-slate-700">
                  <li>een rustdag op een, na overleg met de werknemer door de werkgever te bepalen dag. Deze rustdag zal worden genoteerd binnen een periode van 8 weken. Voor deze compenserende rustdag worden 8 diensturen in de loonberekening betrok-ken;</li>
                  <li>een toeslag van 100% op het uurloon.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vrije weekeinden Tab */}
        <TabsContent value="vrije-weekeinden" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 34 Vrije weekeinden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Per half kalenderjaar dient het rijdend personeel tenminste 13 vrije weekeinden te genieten. Dit betekent, dat zij in de regel 48 uur, echter minimaal 45 uur, aaneengesloten vrij dienen te zijn, gelegen tussen vrijdag 12.00 uur en maandag 12.00 uur.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dienstrooster Tab */}
        <TabsContent value="dienstrooster" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 35 Dienstrooster</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Ten aanzien van het werken op feestdagen zal de werkgever jaarlijks een dienstrooster opstellen; daarbij zal dit werken zoveel mogelijk worden gespreid over de werknemers.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Toeslag nachtelijke uren Tab */}
        <TabsContent value="toeslag-nachtelijke-uren" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 37 Toeslag nachtelijke uren</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Voor eendaagse ritten is voor de diensturen op maandag tot en met zondag gelegen tussen 21.00 – 05.00 uur een toeslag van toepassing van 19% op het uurloon. Van dit percentage mag in positieve zin, ten gunste van de werknemer, worden afgeweken.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Bij samenloop van dit artikel met de ploegendiensttoeslag in de zin van artikel 36 komt enkel de ploegendiensttoeslag tot uitkering.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> De toeslagen op grond van dit artikel en eventuele toeslagen voor overuren, zijn los van elkaar staande toeslagen die gelijktijdig van toepassing kunnen zijn.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> Dit artikel kan ook worden toegepast op diensturen van niet-rijdend personeel op de in lid 1 genoemde tijdstippen. Leden 2 en 3 zijn dan van overeenkomstige toepassing.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reiskosten woon-werkverkeer Tab */}
        <TabsContent value="reiskosten-woon-werk" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 39a Vergoeding reiskosten woon-werkverkeer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-2">
                  <strong>1.</strong> Werknemers hebben recht op de geldende fiscale maximum netto kilometervergoeding met een maximum van 35 km (enkele reisafstand) onder vermindering van de eerste 10 km. Dit betekent voor 2026 een reiskostenvergoeding van € 0,23 per kilometer.
                </p>
                <p className="text-slate-700">
                  De maximale vergoeding per enkele reisafstand is dan 25 x € 0,23 = € 5,75.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> De woon-werkafstand wordt bepaald aan de hand van de routeplanner van de ANWB, van huisadres naar standplaats op basis van de optie "kortste route". De afstand enkele reis wordt afgerond op hele kilometers (0,5 en hoger naar boven, lager dan 0,5 naar beneden).
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>3.</strong> De werknemer heeft geen recht op reiskostenvergoeding indien de werkgever vervoer ter beschikking stelt.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> De reiskostenvergoeding wordt alleen betaald voor de dagen dat er daadwerkelijk woon-werkverkeer heeft plaatsgevonden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>5.</strong> Als de reisafstand voor het woon-werkverkeer door verhuizing van de werknemer groter wordt, is de werkgever niet verplicht het meerdere aan reiskosten te vergoeden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>6.</strong> Van deze regeling mag in positieve zin, ten gunste van de werknemer, worden afgeweken.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verblijfkosten Tab */}
        <TabsContent value="verblijfkosten" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 40 Vergoeding van verblijfkosten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Aan de werknemer worden volgens het in lid 3 van dit artikel opgenomen schema de onderweg gemaakte kosten vergoed bestaande uit maaltijden, overige consumpties en sanitaire voorzieningen. Hieronder vallen niet de kosten van logies, inrichting van de cabine, koersverschillen, uitbetaalde fooien, telefoonkosten en overige kosten.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Van lid 1 kan worden afgeweken indien een afzonderlijke detacheringsregeling is getroffen of de werkgever een regeling heeft getroffen waardoor de werknemer gratis gebruik kan maken van bedrijfskantinefaciliteiten. Deze bedrijfskantinefaciliteiten dienen qua niveau in overeenstemming te zijn met de rechten die normaal gesproken ontleend kunnen worden aan onderstaand schema.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  <strong>3.</strong> De netto verblijfkostenvergoeding bedraagt per 1 januari 2026:
                </p>

                <div className="ml-4 space-y-4">
                  <div>
                    <p className="text-slate-700 font-medium mb-2">
                      <strong>3.a.</strong> Bij ééndaagse ritten, zijnde ritten waarbij het vertrek en de aankomst binnen 24 uur plaatsvinden:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                      <li>korter dan 4 uur afwezig van standplaats geen onbelaste vergoeding</li>
                      <li>langer dan 4 uur afwezig van standplaats € 0,83 per uur</li>
                      <li>tussen 18.00 en 24.00 uur:</li>
                      <ul className="list-none ml-6 space-y-1">
                        <li>indien vertrek voor 14.00 uur € 3,77 per uur</li>
                        <li>indien vertrek na 14.00 uur en er sprake is van een afwezigheidsduur van tenminste 12 uur een extra toeslag van € 15,73</li>
                      </ul>
                    </ul>
                  </div>

                  <div>
                    <p className="text-slate-700 font-medium mb-2">
                      <strong>3.b.</strong> Bij meerdaagse ritten:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                      <li>Eerste dag € 1,65 per uur</li>
                      <li>tussen 17.00 en 24.00 uur indien vertrek voor 17.00 uur € 3,77 per uur</li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-slate-700 font-medium mb-2">
                      <strong>3.c.</strong> Tussentijdse dagen (12 x 1,65 + 12 x 3,77) € 65,04 per dag
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-700 font-medium mb-2">Laatste dag € 1,65 per uur</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                      <li>tussen 18.00 en 24.00 uur € 3,77 per uur</li>
                      <li>tussen 24.00 en 06.00 uur € 1,65 per uur</li>
                      <li>tussen 24.00 en 06.00 uur</li>
                      <li>indien aankomst na 12.00 uur € 3,77 per uur</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-2">
                  <strong>4.</strong> Vergoeding overstaan
                </p>
                <p className="text-slate-700">
                  Ten aanzien van de werknemer die in het kader van zijn dienstuitvoering gedurende een weekend of een (buitenlandse) feestdag niet op zijn standplaats verblijft terwijl aan hem voor die dag geen werkzaamheden zijn of kunnen worden opgedragen, wordt aan hem terzake van de extra kosten van het niet-vrijwillig verblijf een extra vergoeding van € 15,73 netto en € 28,20 bruto per dag toegekend
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consignatievergoeding Tab */}
        <TabsContent value="consignatievergoeding" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 42 Consignatievergoeding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  De werknemer, die opdracht heeft gekregen zich beschikbaar te houden voor te verrichten werkzaamheden, heeft recht op de navolgende vergoeding voor de uren waarvoor hij zich overeenkomstig de opdracht beschikbaar heeft gehouden. Deze vergoeding bedraagt minimaal € 3,40 bruto per uur met een maximum € 27,20 per etmaal. De werkgever kan hier in positieve zin van afwijken.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  Hierbij gelden de volgende voorwaarden:
                </p>
                <div className="space-y-3">
                  <p className="text-slate-700">
                    <strong>a.</strong> aan de werknemer dient vooraf te zijn medegedeeld, dat hij zich gedurende een bepaalde vooraf vastgestelde tijdsruimte beschikbaar moet houden voor het verrich-ten van werk en verplicht is gehoor te geven aan een oproep de dienst aan te vangen.
                  </p>
                  <p className="text-slate-700">
                    <strong>b.</strong> de werknemer komt voor de consignatievergoeding niet in aanmerking indien er sprake is van diensttijd en hij zich in de bedrijfsruimte en/of op of rondom het voertuig bevindt.
                  </p>
                  <p className="text-slate-700">
                    <strong>c.</strong> de werknemer komt evenmin voor de consignatievergoeding in aanmerking indien hij een eenmalige oproep per etmaal ontvangt om de dienst op een bepaald tijdstip aan te vangen.
                  </p>
                  <p className="text-slate-700">
                    <strong>d.</strong> er kan geen samenloop plaatsvinden van loon en/of andere toeslagen met deze consignatievergoeding.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scholing algemeen Tab */}
        <TabsContent value="scholing-algemeen" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 43 Scholing algemeen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Ingeval scholing anders dan bedoeld in artikel 44 wordt gevolgd in opdracht van de werkgever of die wordt gevolgd voor het behouden van code 95 en het TCVT-certificaat en/of op grond van een aan de functie verbonden wettelijke verplichting, dienen aan de werknemer de cursuskosten, het examengeld en de reiskosten (volgens de in dat jaar geldende fiscale maximum netto kilometervergoeding) te worden vergoed. Voorts zal de werkgever de cursustijd a 100% vergoeden. Deze uren tellen niet mee bij de bepaling van het aantal overuren en worden niet als zaterdag-of zondaguren vergoed.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vergoeding certificaten Tab */}
        <TabsContent value="vergoeding-certificaten" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 44 Vergoeding certificaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">A) Vergoeding ADR-certificaat</h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-slate-700">
                    Voor het behalen en periodiek in stand houden van het ADR-certificaat in opdracht van de werkgever, zal de werkgever de cursuskosten, het examengeld en de reiskosten (volgens de in dat jaar geldende fiscale maximum netto kilometervergoeding) vergoeden. Voorts zal de werkgever de terzake bestede cursustijd met een maximum van 40 loonuren (à 100%) vergoeden. Deze uren tellen niet mee bij de bepaling van het aantal overuren.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">B) Vergoeding certificaat vorkheftruck</h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-slate-700">
                    Voor het behalen en periodiek in stand houden van het certificaat vorkheftruck in opdracht van de werkgever en/of het periodiek in stand houden van het vorkheftruckcertificaat op verzoek van de werknemer, zal de werkgever de cursuskosten, het examengeld en de reiskosten (volgens de in dat jaar geldende fiscale maximum netto kilometervergoeding) vergoeden. Voorts zal de werkgever de terzake bestede cursustijd met een maximum van 40 loonuren (à 100%) vergoeden. Deze uren tellen niet mee bij de bepaling van het aantal overuren.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Studiekostenregeling Tab */}
        <TabsContent value="studiekostenregeling" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 45 Studiekostenregeling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  De werkgever heeft de mogelijkheid terzake van de in de artikelen 43 en 44 genoemde kosten voor aanvang van de opleiding een studiekostenregeling aan z'n werknemers voor te leggen indien deze opleidingen niet worden gevolgd in opdracht van de werkgever of op grond van een voor de werkgever wettelijke verplichting.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  Deze studiekostenregeling verplicht de werknemer:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-slate-700">
                  <li>bij ontslagname van de werknemer binnen een jaar na het behalen van het diploma/certificaat: 75% van de kosten van de genoten opleiding terug te betalen;</li>
                  <li>bij ontslagname van de werknemer binnen twee jaar na het behalen van het diploma/certificaat: 50% van de kosten van de genoten opleiding terug te betalen;</li>
                  <li>bij ontslagname van de werknemer binnen drie jaar na het behalen van het diploma/certificaat: 25% van de kosten van de genoten opleiding terug te betalen.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Afwezigheid met behoud van loon Tab */}
        <TabsContent value="afwezigheid-met-loon" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 64 Afwezigheid met behoud van loon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  Wanneer op een of meer dagen, niet zijnde roostervrije dagen, niet wordt gewerkt op grond van een van de navolgende omstandigheden, wordt per dag 8 diensturen genoteerd.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  Deze omstandigheden zijn:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-slate-700">
                  <li>wegens vakantie (artikel 67a en b);</li>
                  <li>tijd-voor-tijd-regeling (artikelen 30 en 31);</li>
                  <li>op algemeen erkende christelijke en nationale feestdagen, niet vallende op zaterdag en/of zondag (artikel 32);</li>
                  <li>bijzonder verlof (artikel 65);</li>
                  <li>wegens ziekte of ongeval buiten schuld of toedoen van de betrokken werknemer (art. 16)</li>
                  <li>ATV-dagen (artikel 68).</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bijzonder verlof Tab */}
        <TabsContent value="bijzonder-verlof" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 65 Bijzonder verlof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
...
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> De werknemer krijgt een vrije dag met behoud van loon toegekend in geval van zijn 25-, 40- of 50-jarig dienstjubileum. Deze vrije dag is extra en kan worden opgenomen in overleg tussen werkgever en werknemer.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bijzonder verlof zonder behoud van loon Tab */}
        <TabsContent value="bijzonder-verlof-zonder-loon" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 66 Bijzonder verlof zonder behoud van loon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 mb-4">
                  Bijzonder verlof zonder behoud van loon wordt toegestaan voor:
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-slate-700">
                      <strong>a.</strong> het uitoefenen van het lidmaatschap van een openbaar lichaam, tenzij het bedrijfsbelang zich daartegen verzet;
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-700">
                      <strong>b.</strong> voor het verrichten van werkzaamheden ten behoeve van een werknemersorganisatie, die partij is bij het afsluiten van deze CAO tot ten hoogste 6 dagen per kalenderjaar, tenzij het bedrijfsbelang zich daartegen verzet;
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-700">
                      <strong>c.</strong> in afwijking van het gestelde in artikel 65 lid 1 sub n geldt voor leden van de werknemersorganisaties, die werkzaam zijn in ondernemingen waar minder dan 10 werknemers lid zijn van de betreffende werknemersorganisatie, dat zij recht hebben gedurende 1 dag per jaar werkzaamheden ten behoeve van een werknemersorganisatie te verrichten, tenzij het bedrijfsbelang zich daartegen verzet. De betrokken werknemersorganisatie kan ten behoeve van de werknemer diens functieloon declareren bij het Opleidings- en Ontwikkelingsfonds.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vakantie Tab */}
        <TabsContent value="vakantie" className="m-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Artikel 67a Vakantie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>1.</strong> Ten aanzien van de vakantie gelden -met inachtneming van de leden 2 tot en met 9 van dit artikel- de wettelijke bepalingen, geregeld in artikel 7:634 BW en verder.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>2.</strong> Het vakantiejaar loopt van 1 januari tot en met 31 december.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  <strong>3a.</strong> De normale vakantie per jaar bedraagt:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>voor werknemers van 16 jaar en jonger 28 dagen</li>
                  <li>voor werknemers van 17 en 18 jaar 26 dagen</li>
                  <li>voor werknemers van 19 t/m 39 jaar 24 dagen</li>
                  <li>voor werknemers van 40 t/m 44 jaar 24 dagen</li>
                  <li>voor werknemers van 45 t/m 49 jaar 25 dagen</li>
                  <li>voor werknemers van 50 t/m 54 jaar 26 dagen</li>
                  <li>voor werknemers van 55 t/m 59 jaar 27 dagen</li>
                  <li>voor werknemers van 60 jaar en ouder 28 dagen</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  <strong>3b.</strong> In afwijking van het gestelde onder a. bedraagt de vakantie per jaar:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-slate-700">
                  <li>voor werknemers met 10 dienstjaren 25 dagen</li>
                  <li>voor werknemers met 15 dienstjaren 26 dagen</li>
                  <li>voor werknemers met 20 dienstjaren 27 dagen</li>
                  <li>voor werknemers met 25 dienstjaren 28 dagen</li>
                  <li>voor werknemers met 30 dienstjaren 29 dagen</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>c.</strong> Het toekennen van vakantiedagen vindt plaats of op grond van de lengte van het dienstverband dan wel op grond van leeftijd; het hoogste aantal dagen prevaleert.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>d.</strong> De werknemer heeft recht op het onder a. respectievelijk b. van lid 3 genoemde aantal vakantiedagen, indien hij op 1 juli de daarbij genoemde leeftijd heeft bereikt, respectievelijk het daarbij genoemde aantal dienstjaren zonder onderbreking in de onderneming heeft vervuld. Als onderbreking wordt niet beschouwd enige vorm van verlof of afwezigheid met instandhouding van de arbeidsovereenkomst.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>4.</strong> Werknemer heeft de mogelijkheid om per kalenderjaar 4 bovenwettelijke vakantiedagen aan te kopen of te verkopen. De waarde van een vakantiedag wordt bepaald overeenkomstig het bepaalde in lid 10 van dit artikel.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>5.</strong> De werknemer heeft geen aanspraak op vakantie over de tijd, gedurende welke hij wegens het niet verrichten van de bedongen arbeid geen aanspraak op in geld vastgesteld loon heeft, tenzij uit artikel 7:635 BW anders voortvloeit.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>6.</strong> De totale aanspraak op vakantie wordt bij het einde van het vakantiejaar, of bij het einde van de dienstbetrekking naar boven afgerond op halve dagen indien het dienstverband van de werknemer tenminste 2 maanden onafgebroken heeft geduurd.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.a.</strong> De werkgever bevordert, dat de werknemer zijn vakantiedagen in het lopende vakantiejaar opneemt. Daartoe zal de werkgever tijdig in overleg met de werknemers jaarlijks een goede vakantieplanning maken.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.b.</strong> Desgewenst geniet de werknemer -voor zover de aanspraak in het betreffende vakantiejaar toereikend zal zijn- drie weken aaneengesloten vakantie.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.c.</strong> De werknemer ouder dan 50 jaar geniet desgewenst – voor zover de aanspraak in het betreffende vakantiejaar toereikend zal zijn – 4 weken aaneengesloten vakantie in een door werkgever na overleg met de werknemer te bepalen periode.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.d.</strong> De werkgever stelt de tijdstippen van aanvang en einde van de vakantie vast na overleg met de werknemer, waarbij de aanvang van de aaneengesloten vakantie zoveel mogelijk zal zijn gelegen in de periode van 1 mei tot en met 30 september.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.e.</strong> De werkgever mag niet bepalen, dat oponthoud tijdens een meerdaagse buitenlandse rit als vakantie zal worden aangemerkt, tenzij met de werknemer op diens verzoek anders is overeengekomen.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>7.f.</strong> De werkgever heeft de bevoegdheid jaarlijks drie verplichte snipperdagen aan te wijzen. Deze snipperdagen moeten direct voorafgaan aan of volgen op een der in artikel 32 genoemde feestdagen. Indien de werkgever van deze mogelijkheid gebruik maakt dient dat tenminste twee maanden van tevoren schriftelijk bekend gemaakt te worden.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>8.</strong> Vakantiedagen worden aan het begin van het kalenderjaar toegekend. De feitelijke opbouw vindt per betalingsperiode plaats. In geval van een negatief saldo aan vakantiedagen bij einde dienstverband, zullen deze bij de eindafrekening worden verrekend.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>9.</strong> De waarde van elke wettelijke en bovenwettelijke vakantiedag waarop de werknemer, bij beëindiging van het dienstverband aanspraak heeft en die niet alsnog wordt genoten, is gelijk aan de waarde op grond van lid 10 van dit artikel.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 font-semibold mb-3">
                  <strong>10.</strong> Met ingang van 1 januari 2026 bestaat de waarde van de 20 wettelijke vakantiedagen en van de bovenwettelijke vakantiedagen, uit de volgende onderdelen (*):
                </p>
                <div className="space-y-3 ml-4">
                  <div>
                    <p className="text-slate-700">
                      <strong>a.</strong> Het functieloon van 1 dag vermeerderd met de persoonlijke toeslag en de ploegentoeslag;
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-700">
                      <strong>b.</strong> Het gemiddelde bedrag dat in het voorafgaande kalenderjaar per gewerkte dag is ontvangen aan vergoeding van de toeslagen voor de zaterdag- en zondagdienst (art. 33), de toeslag voor nachtelijke uren (art. 37) de vuilwerktoeslag (art. 38A), de koudetoeslag (art. 38B), de consignatievergoeding (art. 42), de reisuren voor de werknemers op mobiele kranen (art. 47) en de onregelmatigheidstoeslag (art. 4 Bijlage VII).
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-700">
                      <strong>c.</strong> Het gemiddelde bedrag dat in het voorafgaande kalenderjaar per gewerkte dag is ontvangen aan vergoeding van overuren, zaterdag- en zondaguren, voor zover deze de individueel overeengekomen arbeidstijd per week overschrijden.
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-700">
                      <strong>d.</strong> Indien de in 10 lid b) en lid c) voorgeschreven referentieperiode van het voorafgaande kalender jaar niet passend is, wordt er een passende referntieperiode gekozen.
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-700">
                      <strong>e.</strong> Indien de werknemer in het lopende kalenderjaar in dienst is getreden is het voorafgaande kalenderjaar niet passend. De passende referentieperiode is dan de periode dat de werknemer in dienst is geweest in het lopende kalenderjaar tot de eerste vakantiedag. Deze waarde wordt de rest van het kalenderjaar gehanteerd. De werknemer kan om een nacalculatie vragen aan het einde van het kalenderjaar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700 italic">
                  (*) Partijen bij de CAO spreken de intentie uit toekomstige ontwikkelingen in de rechtspraak te monitoren en nieuwe maatstaven te codificeren in volgende versies van deze CAO.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>11.a.</strong> De werkgever is verplicht aantekening te houden van de door de werknemer opgenomen, respectievelijk aan hem uitbetaalde vakantiedagen/-uren.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>11.b.</strong> Mutaties ten aanzien van het (resterend) aantal vakantiedagen/-uren dienen op de salarisspecificatie te worden vermeld.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-slate-700">
                  <strong>11.c.</strong> De werkgever verstrekt bij het einde van de dienstbetrekking aan de werknemer een verklaring waaruit het aantal bij de beëindiging uitbetaalde vakantiedagen/-uren blijkt.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedRule ? 'Regel Bewerken' : 'Nieuwe Regel'}</span>
              {selectedRule && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je deze regel wilt verwijderen?')) {
                      deleteMutation.mutate(selectedRule.id);
                      setIsDialogOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="bijv. Nachttoeslag"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select 
                  value={formData.rule_type} 
                  onValueChange={(v) => setFormData({ ...formData, rule_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ruleTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Actief">Actief</SelectItem>
                    <SelectItem value="Inactief">Inactief</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Omschrijving</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="bijv. 150"
                />
              </div>
              <div className="space-y-2">
                <Label>Vast bedrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fixed_amount}
                  onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Starttijd</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Eindtijd</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Van toepassing op dagen</Label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <Badge
                    key={day}
                    variant={formData.applies_to_days?.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleDay(day)}
                  >
                    {day.slice(0, 2)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Geldig vanaf</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Geldig tot</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Opslaan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}