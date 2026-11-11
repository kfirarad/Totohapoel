import type { TFunction } from 'i18next';
import type { Group } from '@/core/types';

const host = process.env.EXPO_PUBLIC_INVITE_HOST ?? 'https://groupbet.kfir.app';
export const inviteLink = (code: string) => `${host}/join/${code}`;
export const inviteText = (g: Pick<Group, 'name' | 'join_code'>, t: TFunction) =>
  t('inviteMsg', { name: g.name, link: inviteLink(g.join_code), code: g.join_code });
