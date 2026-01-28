import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

const variants = {
  warning: {
    bg: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600"
  },
  error: {
    bg: "bg-rose-50 border-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-600"
  },
  info: {
    bg: "bg-blue-50 border-blue-200",
    icon: Info,
    iconColor: "text-blue-600"
  },
  success: {
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle,
    iconColor: "text-emerald-600"
  }
};

export function AlertCard({ variant = "warning", title, description, action, onAction, className }) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn(
      "rounded-xl p-4 border flex items-start gap-4",
      config.bg,
      className
    )}>
      <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900">{title}</p>
        {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
      </div>
      {action && onAction && (
        <button 
          onClick={onAction}
          className="text-sm font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
        >
          {action}
        </button>
      )}
    </div>
  );
}