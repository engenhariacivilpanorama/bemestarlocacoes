import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { ContratoEquipamentoPendente, RotasStack } from "../lib/tipos";

type Props = NativeStackScreenProps<RotasStack, "EntregasPendentes">;

export function EntregasPendentesScreen({ navigation }: Props) {
  const { usuario, logout } = useAuth();
  const [itens, setItens] = useState<ContratoEquipamentoPendente[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const dados = await api<ContratoEquipamentoPendente[]>("/entregas/pendentes");
      setItens(dados);
    } finally {
      setCarregando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  return (
    <View style={estilos.container}>
      <View style={estilos.topo}>
        <Text style={estilos.saudacao}>Olá, {usuario?.nome}</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={estilos.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          !carregando ? <Text style={estilos.vazio}>Nenhuma entrega pendente no momento.</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={estilos.cartao}
            onPress={() => navigation.navigate("RegistrarEntrega", { item })}
          >
            <Text style={estilos.equipamento}>{item.equipamento.nome}</Text>
            <Text style={estilos.detalhe}>Patrimônio: {item.equipamento.numeroPatrimonio}</Text>
            <Text style={estilos.detalhe}>Cliente: {item.contrato.cliente.usuario.nome}</Text>
            <Text style={estilos.detalhe}>Obra: {item.contrato.obra.nome}</Text>
            <Text style={estilos.detalhe}>{item.contrato.obra.endereco}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6f8" },
  topo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#d8dce1",
  },
  saudacao: { fontWeight: "700" },
  sair: { color: "#1d4ed8" },
  vazio: { textAlign: "center", color: "#666", marginTop: 40 },
  cartao: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d8dce1",
  },
  equipamento: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  detalhe: { fontSize: 13, color: "#444" },
});
