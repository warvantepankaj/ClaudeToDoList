export type ThemeName = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
};

export const lightTheme: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceMuted: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#4f46e5',
  primaryText: '#ffffff',
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#0284c7',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  placeholder: '#94a3b8',
};

export const darkTheme: ThemeColors = {
  background: '#0b1220',
  surface: '#111827',
  surfaceMuted: '#1f2937',
  border: '#1f2937',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#6366f1',
  primaryText: '#ffffff',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#38bdf8',
  inputBg: '#0f172a',
  inputBorder: '#334155',
  placeholder: '#64748b',
};

export const themes: Record<ThemeName, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};

export const priorityColor = (priority: 'low' | 'medium' | 'high', theme: ThemeColors) => {
  switch (priority) {
    case 'high':
      return theme.danger;
    case 'medium':
      return theme.warning;
    case 'low':
      return theme.info;
  }
};

export const statusColor = (
  status: 'pending' | 'in_progress' | 'completed',
  theme: ThemeColors,
) => {
  switch (status) {
    case 'completed':
      return theme.success;
    case 'in_progress':
      return theme.info;
    case 'pending':
      return theme.textMuted;
  }
};
