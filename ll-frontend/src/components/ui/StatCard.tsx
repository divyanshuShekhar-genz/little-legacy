import type { ReactNode } from 'react';

export function StatCard({ label, value, caption }: { label: string; value: ReactNode; caption?: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-card">
      <small className="text-muted">{label}</small>
      <strong className="mb-[5px] mt-[15px] block text-4xl font-medium">{value}</strong>
      {caption && <small className="text-muted">{caption}</small>}
    </div>
  );
}
