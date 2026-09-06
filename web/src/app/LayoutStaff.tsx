import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function LayoutStaff() {
  const { usuario, logout } = useAuth();

  return (
    <div>
      <header className="topo">
        <strong>Bem Estar Locações — Painel</strong>
        <nav>
          <Link to="/app/clientes">Clientes</Link>
          <Link to="/app/obras">Obras</Link>
          <Link to="/app/equipamentos">Equipamentos</Link>
          <Link to="/app/contratos">Contratos</Link>
          {usuario?.papel === "ADMIN" && <Link to="/app/usuarios">Funcionários</Link>}
          <Link to="/app/minha-senha">Minha senha</Link>
        </nav>
        <div>
          {usuario?.nome} · <button className="secundario" onClick={logout}>Sair</button>
        </div>
      </header>
      <div className="container">
        <Outlet />
      </div>
    </div>
  );
}
