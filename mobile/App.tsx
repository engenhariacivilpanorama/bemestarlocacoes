import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { EntregasPendentesScreen } from "./src/screens/EntregasPendentesScreen";
import { RegistrarEntregaScreen } from "./src/screens/RegistrarEntregaScreen";
import type { RotasStack } from "./src/lib/tipos";

const Stack = createNativeStackNavigator<RotasStack>();

function Navegacao() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!usuario) {
    return <LoginScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="EntregasPendentes"
          component={EntregasPendentesScreen}
          options={{ title: "Entregas pendentes" }}
        />
        <Stack.Screen
          name="RegistrarEntrega"
          component={RegistrarEntregaScreen}
          options={{ title: "Registrar entrega" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navegacao />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
