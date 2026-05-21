import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TaskListScreen from '../screens/TaskListScreen';
import AIChatScreen from '../screens/AIChatScreen';
import CalendarScreen from '../screens/CalendarScreen';
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
  Calendar: undefined;
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

const tabMeta: Record<string, { label: string; glyph: string }> = {
  Dashboard: { label: 'Home', glyph: '◆' },
  Tasks: { label: 'Tasks', glyph: '☰' },
  Calendar: { label: 'Calendar', glyph: '▦' },
  AIChat: { label: 'AI', glyph: '✦' },
};

/**
 * Floating capsule tab bar — hairline border, soft shadow, active tab
 * becomes a lime pill that expands to show its label.
 */
const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  navigation,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!state || !state.routes) return null;

  return (
    <View
      style={[
        tabStyles.wrap,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          tabStyles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = tabMeta[route.name] ?? { label: route.name, glyph: '•' };
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={tabStyles.item}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
            >
              <View
                style={[
                  tabStyles.pill,
                  focused && { backgroundColor: colors.primary },
                ]}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: focused ? colors.primaryText : colors.textMuted,
                    fontWeight: '800',
                  }}
                >
                  {meta.glyph}
                </Text>
                {focused && (
                  <Text
                    style={{
                      marginLeft: 7,
                      color: colors.primaryText,
                      fontSize: 13,
                      fontWeight: '800',
                      letterSpacing: -0.2,
                    }}
                  >
                    {meta.label}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const TabsNavigator: React.FC = () => (
  <MainTabs.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <FloatingTabBar {...props} />}
  >
    <MainTabs.Screen name="Dashboard" component={DashboardScreen} />
    <MainTabs.Screen name="Tasks" component={TaskListScreen} />
    <MainTabs.Screen name="Calendar" component={CalendarScreen} />
    <MainTabs.Screen name="AIChat" component={AIChatScreen} />
  </MainTabs.Navigator>
);

const AppNavigator: React.FC = () => {
  const { colors } = useTheme();
  return (
    <AppStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        headerTintColor: colors.text,
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

const tabStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 999,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    height: 40,
    minWidth: 40,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default RootNavigator;
