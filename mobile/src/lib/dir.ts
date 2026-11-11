import { I18nManager } from 'react-native';

export const fwd = () => (I18nManager.isRTL ? '‹' : '›');
export const back = () => (I18nManager.isRTL ? '›' : '‹');
