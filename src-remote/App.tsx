import { t } from '@remote/lib/i18n';
import RemoteApp from '@remote/app/RemoteApp';

function InvalidLink() {
  return (
    <div className="h-dvh flex items-center justify-center">
      <p className="text-muted-foreground">{t('invalidLink', 'en')}</p>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('t');
  const host = window.location.host;

  if (!token) return <InvalidLink />;

  return <RemoteApp host={host} token={token} />;
}
