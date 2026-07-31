"use client";

import { useEffect, useRef, useState } from "react";

type Stroke = { points: { x: number; y: number }[] };

export function ScratchCanvas({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
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
    context.strokeStyle = "#214a3f";
    // Ignore malformed in-memory entries so an interrupted pointer event cannot crash the page.
    strokes.filter(Boolean).forEach((stroke) => {
      context.beginPath();
      stroke.points.forEach((point, index) =>
        index
          ? context.lineTo(point.x, point.y)
          : context.moveTo(point.x, point.y),
      );
      context.stroke();
    });
  }, [strokes]);

  const getPoint = (event: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div className="scratch">
      <canvas
        ref={canvas}
        onPointerDown={(event) => {
          (event.target as HTMLCanvasElement).setPointerCapture(
            event.pointerId,
          );
          const stroke = { points: [getPoint(event)] };
          active.current = stroke;
          setStrokes((existing) => [...existing, stroke]);
        }}
        onPointerMove={(event) => {
          const stroke = active.current;
          if (!stroke) return;

          // Capture the stroke now. React may execute the state updater after pointer-up,
          // when active.current has already been reset to null.
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
      <div className="scratchTools">
        <button onClick={() => setStrokes((existing) => existing.slice(0, -1))}>
          撤销
        </button>
        <button onClick={() => setStrokes([])}>清空</button>
        <button className="primary" onClick={onClose}>
          完成草稿
        </button>
      </div>
    </div>
  );
}
