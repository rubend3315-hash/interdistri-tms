import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, Loader2, PenTool, Type } from "lucide-react";
import TypedSignature from "./TypedSignature";

export default function SignatureCanvas({ onSign, signing }) {
  const [mode, setMode] = useState("draw"); // "draw" | "type"
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const hasStrokesRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setCanvasReady(true);
  }, []);

  useEffect(() => {
    // Init canvas after a short delay to ensure layout is complete
    const timer = setTimeout(initCanvas, 50);
    return () => clearTimeout(timer);
  }, [initCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasReady) return;

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function onStart(e) {
      e.preventDefault();
      isDrawingRef.current = true;
      hasStrokesRef.current = true;
      setHasDrawn(true);
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function onMove(e) {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const ctx = canvas.getContext('2d');
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function onEnd(e) {
      if (e) e.preventDefault();
      isDrawingRef.current = false;
    }

    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);

    return () => {
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
    };
  }, [canvasReady]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    hasStrokesRef.current = false;
    setHasDrawn(false);
  };

  const handleSign = () => {
    if (!hasStrokesRef.current) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSign(dataUrl);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-normal text-slate-500">
        Onderteken hieronder ter bevestiging van de juistheid van bovenstaande gegevens.
      </p>
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          style={{
            touchAction: 'none',
            width: '100%',
            height: '120px',
            display: 'block',
            cursor: 'crosshair'
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={clearCanvas} type="button">
          Wissen
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={handleSign}
          disabled={signing || !hasDrawn}
          type="button"
        >
          {signing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UserCheck className="w-4 h-4 mr-2" />
          )}
          Ondertekenen
        </Button>
      </div>
    </div>
  );
}