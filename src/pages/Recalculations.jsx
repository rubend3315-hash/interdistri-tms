import React from "react";
import RecalculationCard from "@/components/recalculation/RecalculationCard";

export default function Recalculations() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Herberekeningen</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gebruik deze functies om gegevens opnieuw te berekenen na wijzigingen in tarieven, contracten of CAO-regels.
        </p>
      </div>

      <RecalculationCard
        title="Tijdregistraties opnieuw berekenen"
        type="time_entries"
        description="Met deze functie worden tijdregistraties over de opgegeven periode opnieuw berekend. Tijdregistraties in een loonperiode die al is afgesloten en goedgekeurd worden ook opnieuw berekend."
        useCases={[
          "Een wijziging in het contract van een medewerker toepassen (uurloon)",
          "Een wijziging in de loontabellen",
          "Een wijziging in de vergoeding van verblijfkosten",
          "Wijzigingen in de CAO",
        ]}
        impacts={[
          "Tijdregistraties",
          "Ritregistraties",
          "Voorlopig loonrapport",
        ]}
      />

      <RecalculationCard
        title="Weekoverzichten opnieuw berekenen"
        type="salary_reports"
        description="Met deze functie worden weekoverzichten opnieuw berekend. Weekoverzichten in een loonperiode die al is afgesloten en goedgekeurd worden ook opnieuw berekend."
        useCases={[
          "Een wijziging in het contract van een medewerker toepassen (uurloon)",
          "Wijzigingen in de CAO",
          "Wijzigingen in de loon- of weekberekening",
        ]}
        impacts={[
          "Weekoverzichten",
          "Voorlopig loonrapport",
        ]}
      />

      <RecalculationCard
        title="(PostNL) projecten opnieuw berekenen"
        type="project_prices"
        description="Met deze functie worden (PostNL) projecten opnieuw berekend."
        useCases={[
          "Wijziging in de PostNL tarieven",
        ]}
        impacts={[
          "Projectregistraties",
        ]}
      />

      <RecalculationCard
        title="Artikelen opnieuw berekenen"
        type="article_prices"
        description="Met deze functie wordt de prijs van de artikelen die zijn opgevoerd als charge in projectregistraties opnieuw berekend."
        useCases={[
          "Met terugwerkende kracht corrigeren van artikelprijzen",
        ]}
        impacts={[
          "Geboekte artikelen (charges) in project registraties",
        ]}
      />
    </div>
  );
}