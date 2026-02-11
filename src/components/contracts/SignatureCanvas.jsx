import React, { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, Loader2 } from "lucide-react";

export default function SignatureCanvas({ onSign, signing }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas with white background when mounted
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Set white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasDrawn(false);
  }, []);

  const handleSign = useCallback(async () => {
    const canvas = canvasRef.current;
    // Export as JPEG directly from the canvas (already has white bg)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onSign(dataUrl);
  }, [onSign]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Teken hieronder om het contract te ondertekenen:
      </p>
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          style={{ touchAction: 'none', width: '100%', height: 'auto', display: 'block' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
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