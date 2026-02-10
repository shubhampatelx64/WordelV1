async function getLogs() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/admin/audit`, { cache: 'no-store' });
  return res.json();
}

export default async function AuditPage() {
  const data = await getLogs();
  if (!data.ok) return <p>{data.error.message}</p>;
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Audit Logs</h1>
      <ul className="space-y-1">
        {data.data.map((l: any) => (
          <li key={l.id}>{new Date(l.createdAt).toISOString()} {l.action} {l.targetType} by {l.actor.displayName}</li>
        ))}
      </ul>
    </div>
  );
}
