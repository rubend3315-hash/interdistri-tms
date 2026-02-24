import React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DeleteConfirmDialog({ open, onOpenChange, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[320px] rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">Regel verwijderen?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Weet je zeker dat je deze regel wilt verwijderen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-sm">Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-sm">
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}