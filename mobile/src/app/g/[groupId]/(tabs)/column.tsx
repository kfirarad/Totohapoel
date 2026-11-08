import { useGroupId } from '@/lib/group-id';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ColumnView } from '@/components/column-view';
import { defaultColumn } from '@/lib/columns';
import { Card, Loading, Screen, T } from '@/components/ui';
import { useGroupColumns } from '@/lib/queries';

export default function ColumnTab() {
  const groupId = useGroupId();
  const { t } = useTranslation();
  const cols = useGroupColumns(groupId);
  const [picked, setPicked] = useState<string>();
  if (cols.isPending) return <Loading />;
  if (cols.error) return <Screen><Card><T>{t('error')}: {cols.error.message}</T></Card></Screen>;
  const list = cols.data ?? [];
  const column = list.find((c) => c.id === picked) ?? defaultColumn(list);
  return (
    <Screen>
      {column ? (
        <ColumnView groupId={groupId} columns={list} column={column} onNavigate={setPicked} />
      ) : (
        <Card><T muted>{t('noColumn')}</T></Card>
      )}
    </Screen>
  );
}
