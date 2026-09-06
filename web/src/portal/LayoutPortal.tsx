import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function LayoutPortal() {
  const { usuario, logout } = useAuth();

  return (
    <div>
      <header className="topo">
        <strong>Bem Estar Locações</strong>
        <nav>
          <Link to="/portal">Meus contratos</Link>
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
