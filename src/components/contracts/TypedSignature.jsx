import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Loader2 } from "lucide-react";

const FONT_OPTIONS = [
  { value: "cursive1", label: "Klassiek", family: "'Brush Script MT', 'Segoe Script', cursive" },
  { value: "cursive2", label: "Elegant", family: "'Lucida Handwriting', 'Apple Chancery', cursive" },
  { value: "cursive3", label: "Handgeschreven", family: "'Comic Sans MS', 'Chalkduster', cursive" },
  { value: "cursive4", label: "Formeel", family: "'Palatino Linotype', 'Book Antiqua', serif" },
];

export default function TypedSignature({ onSign, signing }) {
  const [name, setName] = useState("");
  const [selectedFont, setSelectedFont] = useState("cursive1");
  const canvasRef = useRef(null);

  const currentFont = FONT_OPTIONS.find(f => f.value === selectedFont) || FONT_OPTIONS[0];

  const renderPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || !name.trim()) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw signature text
    const fontSize = Math.min(36, rect.width / (name.length * 0.6));
    ctx.font = `italic ${fontSize}px ${currentFont.family}`;
    ctx.fillStyle = '#1a1a2e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, rect.width / 2, rect.height / 2);

    // Draw baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height * 0.72);
    ctx.lineTo(rect.width - 20, rect.height * 0.72);
    ctx.stroke();
  };

  useEffect(() => {
    renderPreview();
  }, [name, selectedFont]);

  // Init canvas on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSign = () => {
    if (!name.trim()) return;
    renderPreview();
    // Small delay to ensure canvas is rendered
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onSign(dataUrl);
    }, 50);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Typ je naam hier..."
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-sm"
          />
        </div>
        <Select value={selectedFont} onValueChange={setSelectedFont}>
          <SelectTrigger className="w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(font => (
              <SelectItem key={font.value} value={font.value}>
                <span style={{ fontFamily: font.family, fontStyle: 'italic' }}>{font.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '120px',
            display: 'block',
          }}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setName("")} type="button">
          Wissen
        </Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={handleSign}
          disabled={signing || !name.trim()}
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