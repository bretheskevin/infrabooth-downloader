import { useAuthStore } from '@/stores/authStore';
import { SignInButton } from './SignInButton';
import { UserBadge } from './UserBadge';

export function AuthContainer() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  return isSignedIn ? <UserBadge /> : <SignInButton />;
}
