import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { RotaProtegida } from "./components/RotaProtegida";
import { LoginPage } from "./pages/LoginPage";
import { CadastroPage } from "./pages/CadastroPage";
import { LayoutStaff } from "./app/LayoutStaff";
import { ClientesPage } from "./app/ClientesPage";
import { ObrasPage } from "./app/ObrasPage";
import { EquipamentosPage } from "./app/EquipamentosPage";
import { ContratosPage } from "./app/ContratosPage";
import { ContratoDetalhePage } from "./app/ContratoDetalhePage";
import { UsuariosPage } from "./app/UsuariosPage";
import { MinhaSenhaPage } from "./app/MinhaSenhaPage";
import { LayoutPortal } from "./portal/LayoutPortal";
import { PortalHomePage } from "./portal/PortalHomePage";
import { ContratoAssinarPage } from "./portal/ContratoAssinarPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />

          <Route
            path="/app"
            element={
              <RotaProtegida papeis={["ADMIN", "FUNCIONARIO"]}>
                <LayoutStaff />
              </RotaProtegida>
            }
          >
            <Route index element={<Navigate to="clientes" replace />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="obras" element={<ObrasPage />} />
            <Route path="equipamentos" element={<EquipamentosPage />} />
            <Route path="contratos" element={<ContratosPage />} />
            <Route path="contratos/:id" element={<ContratoDetalhePage />} />
            <Route path="minha-senha" element={<MinhaSenhaPage />} />
            <Route
              path="usuarios"
              element={
                <RotaProtegida papeis={["ADMIN"]}>
                  <UsuariosPage />
                </RotaProtegida>
              }
            />
          </Route>

          <Route
            path="/portal"
            element={
              <RotaProtegida papeis={["CLIENTE"]}>
                <LayoutPortal />
              </RotaProtegida>
            }
          >
            <Route index element={<PortalHomePage />} />
            <Route path="contratos/:id" element={<ContratoAssinarPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
