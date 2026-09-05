import { useRef, useState } from "react";
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from "expo-camera";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL, api, ApiError } from "../lib/api";
import type { RotasStack } from "../lib/tipos";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = NativeStackScreenProps<RotasStack, "RegistrarEntrega">;

export function RegistrarEntregaScreen({ route, navigation }: Props) {
  const { item } = route.params;
  const [permissaoCamera, solicitarPermissaoCamera] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [foto, setFoto] = useState<CameraCapturedPicture | null>(null);
  const [coordenadas, setCoordenadas] = useState<{ latitude: number; longitude: number } | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [obtendoLocalizacao, setObtendoLocalizacao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function tirarFoto() {
    if (!cameraRef.current) return;
    const capturada = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    setFoto(capturada ?? null);
    await obterLocalizacao();
  }

  async function obterLocalizacao() {
    setObtendoLocalizacao(true);
    setErro(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErro("Permissão de localização negada. Ative o GPS para registrar a entrega.");
        return;
      }
      const posicao = await Location.getCurrentPositionAsync({});
      setCoordenadas({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude });
    } catch {
      setErro("Não foi possível obter a localização atual.");
    } finally {
      setObtendoLocalizacao(false);
    }
  }

  async function confirmarEntrega() {
    if (!foto || !coordenadas) {
      setErro("Tire a foto da entrega e confirme a localização antes de continuar.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();
      formData.append("latitude", String(coordenadas.latitude));
      formData.append("longitude", String(coordenadas.longitude));
      if (observacoes) formData.append("observacoes", observacoes);
      formData.append("foto", {
        uri: foto.uri,
        name: "entrega.jpg",
        type: "image/jpeg",
      } as unknown as Blob);

      const resposta = await fetch(`${API_URL}/entregas/${item.id}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        throw new ApiError(resposta.status, dados.erro ?? "Não foi possível registrar a entrega");
      }

      Alert.alert("Entrega registrada", "A entrega foi registrada com sucesso.");
      navigation.goBack();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível registrar a entrega");
    } finally {
      setEnviando(false);
    }
  }

  if (!permissaoCamera) {
    return <View style={estilos.container} />;
  }

  if (!permissaoCamera.granted) {
    return (
      <View style={estilos.containerCentralizado}>
        <Text style={estilos.texto}>Precisamos da permissão da câmera para registrar a entrega.</Text>
        <TouchableOpacity style={estilos.botao} onPress={solicitarPermissaoCamera}>
          <Text style={estilos.botaoTexto}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={estilos.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={estilos.titulo}>{item.equipamento.nome}</Text>
      <Text style={estilos.subtitulo}>
        {item.contrato.obra.nome} — {item.contrato.cliente.usuario.nome}
      </Text>

      {!foto ? (
        <View style={estilos.cameraContainer}>
          <CameraView ref={cameraRef} style={estilos.camera} facing="back" />
          <TouchableOpacity style={estilos.botaoCaptura} onPress={tirarFoto}>
            <Text style={estilos.botaoTexto}>Tirar foto da entrega</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Image source={{ uri: foto.uri }} style={estilos.preview} />
          <TouchableOpacity style={estilos.botaoSecundario} onPress={() => setFoto(null)}>
            <Text style={estilos.botaoSecundarioTexto}>Tirar outra foto</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={estilos.localizacao}>
        {obtendoLocalizacao && <ActivityIndicator />}
        {coordenadas && (
          <Text style={estilos.texto}>
            Localização capturada: {coordenadas.latitude.toFixed(5)}, {coordenadas.longitude.toFixed(5)}
          </Text>
        )}
      </View>

      <TextInput
        style={estilos.input}
        placeholder="Observações (opcional)"
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
      />

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      <TouchableOpacity
        style={[estilos.botao, (!foto || !coordenadas || enviando) && estilos.botaoDesabilitado]}
        onPress={confirmarEntrega}
        disabled={!foto || !coordenadas || enviando}
      >
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botaoTexto}>Confirmar entrega</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6f8" },
  containerCentralizado: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  titulo: { fontSize: 18, fontWeight: "700" },
  subtitulo: { fontSize: 13, color: "#555", marginBottom: 16 },
  cameraContainer: { height: 320, borderRadius: 8, overflow: "hidden", marginBottom: 16 },
  camera: { flex: 1 },
  preview: { width: "100%", height: 320, borderRadius: 8, marginBottom: 8 },
  botaoCaptura: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  localizacao: { marginVertical: 12 },
  texto: { fontSize: 13, color: "#333" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d8dce1",
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    marginBottom: 12,
    textAlignVertical: "top",
  },
  botao: { backgroundColor: "#1d4ed8", borderRadius: 8, padding: 14, alignItems: "center" },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: "#fff", fontWeight: "700" },
  botaoSecundario: { alignItems: "center", padding: 8, marginBottom: 12 },
  botaoSecundarioTexto: { color: "#1d4ed8", fontWeight: "600" },
  erro: { color: "#c0392b", marginBottom: 12 },
});
