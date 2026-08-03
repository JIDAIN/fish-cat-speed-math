"use client";

import { useEffect, useRef, useState } from "react";

const PEN_COLORS = [
  { label: "深绿色", value: "#214a3f" },
  { label: "黑色", value: "#202020" },
  { label: "红色", value: "#c64b42" },
  { label: "蓝色", value: "#2f6f9f" },
] as const;

type PenColor = (typeof PEN_COLORS)[number]["value"];
type Point = { x: number; y: number };
type Stroke = { color: PenColor; points: Point[] };

function PenIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 20 4.2-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <path d="m14.8 6.4 2.8 2.8" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 15 8-10 8 6-6.7 8.4a2 2 0 0 1-2.8.3L4 15Z" />
      <path d="M9 20h11" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5 19 19M19 5 5 19" />
    </svg>
  );
}

export function ScratchCanvas({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState<PenColor>(PEN_COLORS[0].value);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const active = useRef<Stroke | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = element.clientWidth * ratio;
    element.height = element.clientHeight * ratio;
    context.scale(ratio, ratio);
    context.lineWidth = 3;
    context.lineCap = "round";

    // Color belongs to each stroke so changing pens never recolors earlier work.
    strokes.filter(Boolean).forEach((stroke) => {
      context.beginPath();
      context.strokeStyle = stroke.color ?? PEN_COLORS[0].value;
      stroke.points.forEach((point, index) =>
        index
          ? context.lineTo(point.x, point.y)
          : context.moveTo(point.x, point.y),
      );
      context.stroke();
    });
  }, [strokes]);

  const getPoint = (event: React.PointerEvent): Point => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div className="scratch">
      <canvas
        aria-label="手写草稿画布"
        ref={canvas}
        onPointerDown={(event) => {
          (event.target as HTMLCanvasElement).setPointerCapture(
            event.pointerId,
          );
          const stroke: Stroke = { color: penColor, points: [getPoint(event)] };
          active.current = stroke;
          setStrokes((existing) => [...existing, stroke]);
        }}
        onPointerMove={(event) => {
          const stroke = active.current;
          if (!stroke) return;

          // Capture the stroke now. React may run the updater after pointer-up.
          stroke.points.push(getPoint(event));
          setStrokes((existing) => [...existing.slice(0, -1), stroke]);
        }}
        onPointerUp={() => {
          active.current = null;
        }}
        onPointerCancel={() => {
          active.current = null;
        }}
      />
      <div aria-label="草稿工具" className="scratchTools" role="toolbar">
        <div className="scratchColorControl">
          {paletteOpen && (
            <div aria-label="画笔颜色" className="scratchPalette" role="group">
              {PEN_COLORS.map((color) => (
                <button
                  aria-label={`使用${color.label}画笔`}
                  aria-pressed={penColor === color.value}
                  className="scratchPaletteOption"
                  key={color.value}
                  onClick={() => {
                    setPenColor(color.value);
                    setPaletteOpen(false);
                  }}
                  style={{ "--pen-color": color.value } as React.CSSProperties}
                  type="button"
                />
              ))}
            </div>
          )}
          <button
            aria-expanded={paletteOpen}
            aria-label="选择画笔颜色"
            className="scratchToolButton scratchColorButton"
            onClick={() => setPaletteOpen((open) => !open)}
            type="button"
          >
            <PenIcon />
            <span
              aria-hidden="true"
              className="scratchCurrentColor"
              style={{ backgroundColor: penColor }}
            />
          </button>
        </div>
        <button
          aria-label="清空草稿"
          className="scratchToolButton"
          onClick={() => {
            active.current = null;
            setStrokes([]);
          }}
          type="button"
        >
          <ClearIcon />
        </button>
        <button
          aria-label="关闭草稿"
          className="scratchToolButton scratchCloseButton"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
