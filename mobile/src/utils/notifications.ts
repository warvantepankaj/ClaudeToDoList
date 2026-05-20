import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionRequested = false;

export const ensureNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
};

export const scheduleTodoReminder = async (params: {
  todoId: string;
  title: string;
  dueDate: Date;
}): Promise<string | null> => {
  if (Platform.OS === 'web') return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  if (params.dueDate.getTime() <= Date.now()) return null;
  const identifier = await Notifications.scheduleNotificationAsync({
    identifier: `todo-${params.todoId}`,
    content: {
      title: 'Todo due',
      body: params.title,
      data: { todoId: params.todoId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: params.dueDate },
  });
  return identifier;
};

export const cancelTodoReminder = async (todoId: string): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`todo-${todoId}`);
  } catch {
    // identifier may not exist — safe to ignore
  }
};
