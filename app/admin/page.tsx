import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="grid grid-cols-[220px_1fr] gap-4">
      <aside className="bg-white p-4 shadow space-y-2">
        <h2 className="font-semibold">Admin</h2>
        <Link className="block" href="/admin?tab=words">Words</Link>
        <Link className="block" href="/admin?tab=schedule">Daily schedule</Link>
        <Link className="block" href="/admin?tab=games">Custom games</Link>
        <Link className="block" href="/admin?tab=users">Users</Link>
        <Link className="block" href="/admin/audit">Audit Logs</Link>
      </aside>
      <section className="bg-white p-4 shadow">
        <h1 className="text-xl font-bold mb-2">Admin panel</h1>
        <p>Use API routes from this panel tabs. Phase 2 management endpoints are active.</p>
      </section>
    </div>
  );
}
