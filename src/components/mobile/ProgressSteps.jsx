import React from "react";
import { Check } from "lucide-react";

export default function ProgressSteps({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between px-2 py-3 bg-white rounded-xl border border-slate-200 mb-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                    ? "bg-blue-600 text-white ring-2 ring-blue-200"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={`text-[10px] leading-tight text-center max-w-[60px] ${
                  isCompleted
                    ? "text-emerald-600 font-medium"
                    : isCurrent
                    ? "text-blue-700 font-semibold"
                    : "text-slate-400"
                }`}
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-0.5 mx-1 rounded transition-all duration-300 ${
                  isCompleted ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}