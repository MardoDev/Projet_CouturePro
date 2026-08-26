export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="font-body text-sm text-foreground/60">{message}</p>
    </div>
  );
}
