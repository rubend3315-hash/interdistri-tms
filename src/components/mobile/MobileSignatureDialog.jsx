import React, { useRef, useEffect, useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, Check, X } from "lucide-react";

export default function MobileSignatureDialog({ open, onOpenChange, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      const width = container.clientWidth;
      const height = Math.max(180, Math.min(260, window.innerHeight * 0.35));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      setHasDrawn(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [open]);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0];
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleStart = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [getPos]);

  const handleMove = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing, getPos]);

  const handleEnd = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    setHasDrawn(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;
    setIsSaving(true);
    const dataUrl = canvas.toDataURL("image/png");
    try {
      const result = await onSave(dataUrl);
      if (result?.success) onOpenChange(false);
      // If failed but not needsSignature, close dialog anyway (error toast is already shown by submit handler)
      else if (result && !result.needsSignature) onOpenChange(false);
    } catch (err) {
      console.error('[MobileSignatureDialog] onSave error:', err);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] p-0 flex flex-col rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <button type="button" onClick={() => onOpenChange(false)} className="p-1 -ml-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <span className="text-sm font-semibold text-slate-900">Handtekening zetten</span>
          <div className="w-7" />
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col justify-center px-4 py-4 bg-white">
          <p className="text-xs text-slate-500 text-center mb-3">
            Gebruik je vinger om hieronder te tekenen
          </p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              className="touch-none w-full cursor-crosshair"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-white space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-[44px]" onClick={clearCanvas}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Wissen
            </Button>
            <Button
              className="flex-1 h-[44px] bg-blue-600 hover:bg-blue-700"
              onClick={handleSave}
              disabled={!hasDrawn || isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Indienen...
                </span>
              ) : (
                <><Check className="w-4 h-4 mr-1.5" /> Opslaan & Indienen</>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}