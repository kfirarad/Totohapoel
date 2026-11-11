import { format, formatDistanceToNow } from 'date-fns';
import { enUS, he } from 'date-fns/locale';
import i18n from '@/lib/i18n';

const locale = () => (i18n.language === 'en' ? enUS : he);

export const formatGameTime = (iso: string) => (iso ? format(new Date(iso), 'EEE HH:mm', { locale: locale() }) : '');
export const formatDate = (iso: string) => format(new Date(iso), 'd MMM HH:mm', { locale: locale() });
export const fromNow = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: locale() });
export const isPast = (iso: string) => new Date(iso) <= new Date();
