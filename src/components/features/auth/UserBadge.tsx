import { useAuthStore } from '@/stores/authStore';

export function UserBadge() {
  const username = useAuthStore((state) => state.username);

  return (
    <div className="text-sm text-muted-foreground">
      {username ?? 'Signed in'}
    </div>
  );
}
