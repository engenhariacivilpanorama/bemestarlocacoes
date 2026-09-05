import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function aoEntrar() {
    setErro(null);
    setEntrando(true);
    try {
      await login(email, senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={estilos.container}>
      <Text style={estilos.titulo}>Bem Estar Locações</Text>
      <Text style={estilos.subtitulo}>App de entregas — equipe de campo</Text>

      <TextInput
        style={estilos.input}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={estilos.input}
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      <TouchableOpacity style={estilos.botao} onPress={aoEntrar} disabled={entrando}>
        {entrando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botaoTexto}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f5f6f8" },
  titulo: { fontSize: 22, fontWeight: "700", marginBottom: 4, textAlign: "center" },
  subtitulo: { fontSize: 14, color: "#555", marginBottom: 24, textAlign: "center" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8dce1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  botao: { backgroundColor: "#1d4ed8", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  botaoTexto: { color: "#fff", fontWeight: "700" },
  erro: { color: "#c0392b", marginBottom: 8 },
});
