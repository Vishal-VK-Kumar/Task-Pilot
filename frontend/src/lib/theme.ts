export const colors = {
  surface: '#FFFFFF',
  onSurface: '#1C1C1E',
  surfaceSecondary: '#F2F2F7',
  onSurfaceSecondary: '#6E6E73',
  surfaceTertiary: '#E5E5EA',
  onSurfaceTertiary: '#8E8E93',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  divider: '#E5E5EA',
  brandPrimary: '#1C1C1E',
  onBrandPrimary: '#FFFFFF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#007AFF',
  jobAccent: '#007AFF',
  studiesAccent: '#AF52DE',
  personalAccent: '#FF9500',
  overdueAccent: '#FF3B30',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const font = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export type ListKey = 'job' | 'studies' | 'personal';

export const listAccent = (l: ListKey): string => {
  if (l === 'job') return colors.jobAccent;
  if (l === 'studies') return colors.studiesAccent;
  return colors.personalAccent;
};

export const listLabel = (l: ListKey): string => {
  if (l === 'job') return 'Job';
  if (l === 'studies') return 'Studies';
  return 'Personal';
};
