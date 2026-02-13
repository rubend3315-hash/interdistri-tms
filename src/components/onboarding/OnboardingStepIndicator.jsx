import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { number: 1, label: "Medewerker" },
  { number: 2, label: "Stamkaart" },
  { number: 3, label: "Verklaringen" },
  { number: 4, label: "Contract" },
  { number: 5, label: "Uitnodiging" },
  { number: 6, label: "Overzicht" },
];

export default function OnboardingStepIndicator({ currentStep, onStepClick }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.number;
        const isCurrent = currentStep === step.number;
        return (
          <React.Fragment key={step.number}>
            {idx > 0 && (
              <div className={cn("flex-1 h-0.5 min-w-[20px]", isCompleted ? "bg-blue-500" : "bg-slate-200")} />
            )}
            <button
              onClick={() => onStepClick?.(step.number)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors text-sm",
                isCurrent && "bg-blue-50 text-blue-700 font-medium",
                isCompleted && "text-blue-600",
                !isCurrent && !isCompleted && "text-slate-400"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
              ) : (
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  isCurrent ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                )}>
                  {step.number}
                </div>
              )}
              <span className="hidden md:inline">{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}