import { useDeferredValue, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Toolbar } from '@/components/ui/Toolbar';
import { DataTable } from '@/components/ui/DataTable';
import { useRegisteredUsers } from '@/api/users';

const registeredDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB'); // 14/09/2026

/** Guide §4 · prototype folder-alignment.js "Registered Users". Read-only. */
export function RegisteredUsersPage() {
  const [search, setSearch] = useState('');
  const [age, setAge] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const { data, isLoading } = useRegisteredUsers({ search: deferredSearch, age });

  return (
    <>
      <PageHeader
        back={{ to: '/users', label: 'User Management' }}
        eyebrow="Users"
        title="Registered Users"
        subtitle="Parent accounts and their child profiles."
      />
      <Toolbar
        search={search}
        onSearch={setSearch}
        filter={age}
        onFilter={setAge}
        filters={(data?.ages ?? []).map((a) => ({ value: String(a), label: String(a) }))}
      />
      <Panel>
        <DataTable
          loading={isLoading}
          rows={data?.rows}
          rowKey={(r) => r.childId ?? r.parentId}
          columns={[
            { header: 'Name', cell: (r) => r.parentName },
            { header: 'Email', cell: (r) => r.email },
            { header: 'Child name', cell: (r) => r.childName ?? '—' },
            { header: 'Age band', cell: (r) => (r.age === null ? '—' : `${r.age} years`) },
            { header: 'Registered at', cell: (r) => registeredDate(r.registeredAt) },
          ]}
        />
      </Panel>
    </>
  );
}
