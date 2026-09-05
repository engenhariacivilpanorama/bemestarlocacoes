import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Cliente } from "../lib/tipos";

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Cliente[]>("/clientes")
      .then(setClientes)
      .catch(() => setErro("Não foi possível carregar os clientes"));
  }, []);

  return (
    <div>
      <h1>Clientes</h1>
      <p style={{ color: "#555" }}>
        Clientes se cadastram sozinhos pela página de cadastro. Aqui você acompanha quem já está na base.
      </p>
      {erro && <p className="erro">{erro}</p>}
      {!clientes && !erro && <p>Carregando…</p>}
      {clientes && (
        <div className="cartao">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Endereço</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.usuario.nome}</td>
                  <td>{cliente.usuario.email}</td>
                  <td>{cliente.documento}</td>
                  <td>{cliente.telefone}</td>
                  <td>{cliente.endereco}</td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhum cliente cadastrado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
