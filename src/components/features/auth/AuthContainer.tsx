import { useAuthStore } from '@/stores/authStore';
import { SignInButton } from './SignInButton';
import { UserMenu } from './UserMenu';

export function AuthContainer() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  return (
    <div className="transition-opacity duration-200">
      {isSignedIn ? <UserMenu /> : <SignInButton />}
    </div>
  );
}
