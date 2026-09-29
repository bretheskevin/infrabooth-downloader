import { useAuthStore } from '@/features/auth/store';
import { UserMenu } from './UserMenu';
import { SignInButton } from './SignInButton';
import { ProfileSelectDialog } from './ProfileSelectDialog';
import { ConnectionHelpDialog } from './ConnectionHelpDialog';

export function AuthContainer() {
  const isSignedIn = useAuthStore((state) => state.isSignedIn);

  return (
    <div className="transition-opacity duration-200">
      {isSignedIn ? <UserMenu /> : <SignInButton />}
      <ProfileSelectDialog />
      <ConnectionHelpDialog />
    </div>
  );
}
