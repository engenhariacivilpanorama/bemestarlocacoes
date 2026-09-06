import { useRef, useState, type PointerEvent } from "react";

interface Props {
  onAssinaturaChange: (base64: string | null) => void;
}

export function AssinaturaCanvas({ onAssinaturaChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraço, setTemTraço] = useState(false);

  function pegarContexto() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function posicao(evento: PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  }

  function aoIniciar(evento: PointerEvent<HTMLCanvasElement>) {
    const ctx = pegarContexto();
    if (!ctx) return;
    desenhando.current = true;
    const { x, y } = posicao(evento);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function aoMover(evento: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = pegarContexto();
    if (!ctx) return;
    const { x, y } = posicao(evento);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineTo(x, y);
    ctx.stroke();
    setTemTraço(true);
  }

  function aoSoltar() {
    desenhando.current = false;
    const canvas = canvasRef.current;
    if (canvas) onAssinaturaChange(canvas.toDataURL("image/png"));
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = pegarContexto();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraço(false);
    onAssinaturaChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        style={{ border: "1px solid var(--cor-borda)", borderRadius: 6, touchAction: "none", background: "#fff" }}
        onPointerDown={aoIniciar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerLeave={aoSoltar}
      />
      <div style={{ marginTop: 8 }}>
        <button type="button" className="secundario" onClick={limpar} disabled={!temTraço}>
          Limpar assinatura
        </button>
      </div>
    </div>
  );
}
