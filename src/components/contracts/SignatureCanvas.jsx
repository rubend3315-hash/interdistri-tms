import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, Loader2 } from "lucide-react";

export default function SignatureCanvas({ onSign, signing }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution to match display size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Drawing style - BLACK pen
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Touch/mouse handlers
    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    }

    function onStart(e) {
      e.preventDefault();
      isDrawingRef.current = true;
      setHasDrawn(true);
      const ctx2 = canvas.getContext('2d');
      // Always enforce black stroke before drawing
      ctx2.strokeStyle = '#000000';
      ctx2.lineWidth = 2.5;
      ctx2.lineCap = 'round';
      ctx2.lineJoin = 'round';
      const pos = getPos(e);
      ctx2.beginPath();
      ctx2.moveTo(pos.x, pos.y);
    }

    function onMove(e) {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const ctx2 = canvas.getContext('2d');
      const pos = getPos(e);
      ctx2.lineTo(pos.x, pos.y);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(pos.x, pos.y);
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
  }, []);

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
    setHasDrawn(false);
  };

  const handleSign = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSign(dataUrl);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-2">
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
        <Button variant="outline" className="flex-1" onClick={clearCanvas}>
          Wissen
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={handleSign}
          disabled={signing || !hasDrawn}
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