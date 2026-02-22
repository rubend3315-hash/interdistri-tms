import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Medewerker" },
  { number: 2, label: "Stamkaart" },
  { number: 3, label: "Verklaringen" },
  { number: 4, label: "Contract" },
  { number: 5, label: "Mobiele Toegang" },
  { number: 6, label: "Uitnodiging" },
  { number: 7, label: "Overzicht" },
];

export default function OnboardingStepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 print:hidden">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        return (
          <React.Fragment key={step.number}>
            {idx > 0 && (
              <div className={cn("flex-1 h-px min-w-[16px]", isCompleted ? "bg-blue-500" : "bg-slate-200")} />
            )}
            <button
              onClick={() => onStepClick?.(step.number)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors text-sm",
                isCurrent && "bg-blue-50 text-blue-700 font-medium",
                isCompleted && "text-blue-600",
                !isCurrent && !isCompleted && "text-slate-400"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              ) : (
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isCurrent ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {step.number}
                </div>
              )}
              <span className="hidden md:inline text-sm">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}