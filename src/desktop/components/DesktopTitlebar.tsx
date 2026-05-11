import * as React from 'react';
import { Text } from '@valpro-labs/ui';

import iconUrl from '@assets/icons/IconMouseOver.png';

interface DesktopTitlebarProps {
  isMaximized: boolean;
  onClose: () => void;
  onDragMove: React.MouseEventHandler<HTMLElement>;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}

export function DesktopTitlebar({
  isMaximized,
  onClose,
  onDragMove,
  onMinimize,
  onToggleMaximize
}: DesktopTitlebarProps) {
  return (
    <header className="titlebar" onMouseDown={onDragMove}>
      <div className="brand">
        <span className="brand-mark">
          <img src={iconUrl} alt="" />
        </span>
        <div className="brand-copy">
          <Text className="text-sm font-bold leading-tight">VALPRO</Text>
          <Text className="text-muted-foreground text-xs leading-tight">Overwolf starter</Text>
        </div>
      </div>

      <div className="window-actions">
        <button type="button" className="window-button" onClick={onMinimize} aria-label="Minimize" title="Minimize">
          <span className="window-icon minimize" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="window-button"
          onClick={onToggleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          <span className={`window-icon ${isMaximized ? 'restore' : 'maximize'}`} aria-hidden="true" />
        </button>
        <button type="button" className="window-button danger" onClick={onClose} aria-label="Close" title="Close">
          <span className="window-icon close" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
