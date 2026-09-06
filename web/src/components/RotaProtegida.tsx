import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth, type Usuario } from "../lib/auth";

export function RotaProtegida({
  children,
  papeis,
}: {
  children: ReactNode;
  papeis: Usuario["papel"][];
}) {
  const { usuario, carregando } = useAuth();

  if (carregando) return <p>Carregando…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!papeis.includes(usuario.papel)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
