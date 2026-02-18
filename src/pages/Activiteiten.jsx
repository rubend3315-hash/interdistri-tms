import React from "react";
import ActiviteitTab from "../components/settings/ActiviteitTab";

export default function Activiteiten() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Activiteiten</h1>
        <p className="text-slate-500 mt-1">Beheer activiteiten voor standplaatswerk</p>
      </div>
      <ActiviteitTab />
    </div>
  );
}