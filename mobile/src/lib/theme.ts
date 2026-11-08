import { useColorScheme } from 'react-native';

const light = {
  bg: '#f3f3f1', surface: '#ffffff', ink: '#1b1b1b', muted: '#6d6d6a', line: '#d8d8d4',
  fill: '#ececea', fill2: '#dcdcd8', accent: '#2563eb', accentInk: '#ffffff', accentSoft: '#dde7ff', danger: '#c62828',
};
const dark: typeof light = {
  bg: '#0f0f10', surface: '#1b1b1d', ink: '#ececec', muted: '#9b9b98', line: '#34343a',
  fill: '#28282c', fill2: '#38383e', accent: '#5b8cff', accentInk: '#0b1020', accentSoft: '#1c2846', danger: '#ef5350',
};

export type Colors = typeof light;
export const useColors = (): Colors => (useColorScheme() === 'dark' ? dark : light);
export const radius = { sm: 10, md: 12, lg: 14 };
