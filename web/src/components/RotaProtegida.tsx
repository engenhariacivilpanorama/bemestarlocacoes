import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";

export function RotaProtegida({
  children,
  papel,
}: {
  children: ReactNode;
  papel: "STAFF" | "CLIENTE";
}) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <p>Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.papel !== papel) return <Navigate to="/" replace />;

  return <>{children}</>;
}
