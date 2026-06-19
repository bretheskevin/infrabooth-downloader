import { useDownloadDockState } from '../hooks/useDownloadDockState';
import { DownloadDock } from './DownloadDock';
import { DownloadDashboard } from './DownloadDashboard';

export function DownloadOverlay() {
  const dockState = useDownloadDockState();

  return (
    <>
      <DownloadDock dockState={dockState} />
      <DownloadDashboard isOpen={dockState.isDashboardOpen} onClose={dockState.closeDashboard} />
    </>
  );
}
