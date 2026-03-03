import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, X, Check, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { cn } from "@/lib/utils";

const ALLOWED_TARGET_PAGES = [
  "MobileEntry",
  "Contracts",
  "EditTimeEntry",
  "Planning",
  "Trips",
  "Vehicles",
  "Employees",
  "SalaryReports",
  "Recalculations",
  "Dashboard",
  "Messages",
  "Customers",
  "Projects"
];

const ADMIN_ONLY_PAGES = [
  "Employees",
  "SalaryReports",
  "Recalculations",
  "Backups",
  "AuditLog",
  "DataMigration",
  "HRImport",
  "HRMSettings",
  "Integrations"
];

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allNotifications = await base44.entities.Notification.list('-created_date', 50);
      return allNotifications.filter(n => 
        n.user_ids && n.user_ids.includes(user.id)
      );
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Subscribe to notification updates
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    
    return unsubscribe;
  }, [user?.id, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.target_page) {
      if (
        ALLOWED_TARGET_PAGES.includes(notification.target_page) &&
        (user.role === "admin" || !ADMIN_ONLY_PAGES.includes(notification.target_page))
      ) {
        navigate(createPageUrl(notification.target_page));
      } else {
        console.warn("Blocked invalid or unauthorized notification target:", notification.target_page);
      }
      setOpen(false);
    }
  };

  const getIcon = (type, priority) => {
    if (type === 'import_success') {
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (type === 'import_failed') {
      return <X className="w-4 h-4 text-red-600" />;
    }
    if (priority === 'urgent' || priority === 'high') {
      return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    }
    return <Info className="w-4 h-4 text-blue-600" />;
  };

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-3 py-2 border-b">
          <p className="font-semibold text-sm">Notificaties</p>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-500">{unreadCount} ongelezen</p>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Geen notificaties
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <div key={notification.id}>
                <DropdownMenuItem
                  className={cn(
                    "flex flex-col items-start gap-2 p-3 cursor-pointer",
                    !notification.is_read && "bg-blue-50"
                  )}
                  onSelect={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-2 w-full">
                    {getIcon(notification.type, notification.priority)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {notification.title}
                      </p>
                      {notification.description && (
                        <p className="text-xs text-slate-600 mt-1">
                          {notification.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.created_date).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}