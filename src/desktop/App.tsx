import { DesktopTitlebar } from '@/desktop/components/DesktopTitlebar';
import { StarterPanel } from '@/desktop/components/StarterPanel';

import { useOverwolfWindow } from '@/desktop/hooks/useOverwolfWindow';

export function App() {
  const {
    isMaximized,
    isOverwolfReady,
    windowName,
    closeWindow,
    dragMove,
    minimizeWindow,
    toggleMaximizeWindow
  } = useOverwolfWindow();

  return (
    <div className="app">
      <DesktopTitlebar
        isMaximized={isMaximized}
        onClose={closeWindow}
        onDragMove={dragMove}
        onMinimize={minimizeWindow}
        onToggleMaximize={toggleMaximizeWindow}
      />
      <StarterPanel isOverwolfReady={isOverwolfReady} windowName={windowName} />
    </div>
  );
}
