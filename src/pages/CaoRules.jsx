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