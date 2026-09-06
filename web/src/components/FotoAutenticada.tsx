import { useEffect, useState } from "react";
import { carregarImagemAutenticada } from "../lib/api";

export function FotoAutenticada({ rota, alt, tamanho = 48 }: { rota: string; alt: string; tamanho?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    carregarImagemAutenticada(rota)
      .then((u) => {
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => setUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [rota]);

  if (!url) {
    return (
      <div
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: 6,
          background: "#eee",
        }}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      style={{ width: tamanho, height: tamanho, objectFit: "cover", borderRadius: 6 }}
    />
  );
}
