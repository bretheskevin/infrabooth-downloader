export default function StatusBarBackdrop() {
  return (
    <div
      aria-hidden="true"
      data-testid="status-bar-backdrop"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-zinc-950 dark:hidden"
    />
  );
}
