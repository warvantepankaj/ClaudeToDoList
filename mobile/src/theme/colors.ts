export type ThemeName = 'light' | 'dark';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceContrast: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textInverse: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
};

// Editorial Minimalism with Lime Accent.
// Reference: a premium productivity app — crisp whites, near-black text,
// chartreuse as a sharp signature, hairline borders, no gradient noise.
export const lightTheme: ThemeColors = {
  background: '#FAFAFA',     // off-white, less clinical than pure white
  surface: '#FFFFFF',         // cards float above the background
  surfaceMuted: '#F4F4F5',    // nested sections, very subtle
  surfaceContrast: '#0A0A0A', // for the dark "hero" header treatment
  border: '#EAEAEA',          // hairline
  borderStrong: '#D4D4D8',    // for emphasized boundaries
  text: '#0A0A0A',            // deep, never pure black
  textMuted: '#71717A',       // zinc-500
  textInverse: '#FAFAFA',     // text on dark surfaces
  primary: '#C5EE51',         // chartreuse — the signature
  primaryText: '#0A0A0A',     // black on lime, like the reference
  primarySoft: '#E8F5C4',     // lime tint for soft fills
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  info: '#7C7AED',            // muted lavender — secondary accent
  inputBg: '#FFFFFF',
  inputBorder: '#E4E4E7',
  placeholder: '#A1A1AA',
};

export const darkTheme: ThemeColors = {
  background: '#0A0A0A',
  surface: '#18181B',
  surfaceMuted: '#27272A',
  surfaceContrast: '#FFFFFF',
  border: '#27272A',
  borderStrong: '#3F3F46',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textInverse: '#0A0A0A',
  primary: '#C5EE51',         // same lime — sings on dark
  primaryText: '#0A0A0A',
  primarySoft: '#374317',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#A5A4F1',
  inputBg: '#18181B',
  inputBorder: '#3F3F46',
  placeholder: '#71717A',
};

export const themes: Record<ThemeName, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};

export const priorityColor = (
  priority: 'low' | 'medium' | 'high',
  theme: ThemeColors,
) => {
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
      return theme.primary;
    case 'pending':
      return theme.textMuted;
  }
};
