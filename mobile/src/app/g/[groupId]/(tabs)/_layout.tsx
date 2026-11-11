import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

/** Same three tabs for every role; admin settings live behind Members ⚙ and the switcher. */
export default function Tabs() {
  const { t } = useTranslation();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="column">
        <NativeTabs.Trigger.Icon sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} md="list_alt" />
        <NativeTabs.Trigger.Label>{t('tabColumn')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="leaderboard" />
        <NativeTabs.Trigger.Label>{t('tabStats')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="members">
        <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
        <NativeTabs.Trigger.Label>{t('tabMembers')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
