import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TaskListScreen from '../screens/TaskListScreen';
import AIChatScreen from '../screens/AIChatScreen';
import TodoFormScreen from '../screens/TodoFormScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { Todo } from '../api/types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  AIChat: undefined;
};

export type AppStackParamList = {
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  TodoForm: { todo?: Todo };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator: React.FC = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const tabLabel: Record<keyof MainTabParamList, { label: string; glyph: string }> = {
  Dashboard: { label: 'Home', glyph: '◆' },
  Tasks: { label: 'Tasks', glyph: '☰' },
  AIChat: { label: 'AI', glyph: '✦' },
};

const TabsNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>{tabLabel[route.name].glyph}</Text>
        ),
        tabBarLabel: tabLabel[route.name].label,
      })}
    >
      <MainTabs.Screen name="Dashboard" component={DashboardScreen} />
      <MainTabs.Screen name="Tasks" component={TaskListScreen} />
      <MainTabs.Screen name="AIChat" component={AIChatScreen} />
    </MainTabs.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AppStack.Screen
        name="MainTabs"
        component={TabsNavigator}
        options={{ headerShown: false }}
      />
      <AppStack.Screen
        name="TodoForm"
        component={TodoFormScreen}
        options={{ title: 'Task', presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  const { token, loading } = useAuth();
  const { name, colors } = useTheme();
  const navTheme = name === 'dark' ? DarkTheme : DefaultTheme;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
        },
      }}
    >
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RootNavigator;
