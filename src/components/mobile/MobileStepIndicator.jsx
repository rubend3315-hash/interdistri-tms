import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileStepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold",
              done ? "bg-emerald-500 text-white" :
              active ? "bg-blue-600 text-white" :
              "bg-slate-200 text-slate-400"
            )}>
              {done ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("w-3 h-0.5 rounded", done ? "bg-emerald-400" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}