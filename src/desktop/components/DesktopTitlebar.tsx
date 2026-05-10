import * as React from 'react';
import { Text } from '@valpro-labs/ui';

import iconUrl from '@assets/icons/IconMouseOver.png';

interface DesktopTitlebarProps {
  gameStatus: string;
  isMaximized: boolean;
  onClose: () => void;
  onDragMove: React.MouseEventHandler<HTMLElement>;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}

export function DesktopTitlebar({
  gameStatus,
  isMaximized,
  onClose,
  onDragMove,
  onMinimize,
  onToggleMaximize
}: DesktopTitlebarProps) {
  return (
    <header className="titlebar" data-drag-region onMouseDown={onDragMove}>
      <div className="titlebar-brand">
        <div className="brand">
          <span className="brand-mark">
            <img src={iconUrl} alt="" />
          </span>
          <div className="brand-copy">
            <Text className="text-sm font-bold leading-tight">VALPRO</Text>
            <Text className="text-muted-foreground text-xs leading-tight">Desktop</Text>
          </div>
        </div>
      </div>

      <div className="titlebar-main">
        <nav className="breadcrumb" aria-label="Current location">
          <Text className="breadcrumb-muted">Dashboard</Text>
          <span className="breadcrumb-separator" aria-hidden="true" />
          <Text className="breadcrumb-current">Capture</Text>
        </nav>

        <div className="titlebar-status">
          <span className="titlebar-status-dot" />
          <Text className="titlebar-status-text">{gameStatus}</Text>
        </div>
      </div>

      <WindowActions
        isMaximized={isMaximized}
        onClose={onClose}
        onMinimize={onMinimize}
        onToggleMaximize={onToggleMaximize}
      />
    </header>
  );
}

function WindowActions({
  isMaximized,
  onClose,
  onMinimize,
  onToggleMaximize
}: Pick<DesktopTitlebarProps, 'isMaximized' | 'onClose' | 'onMinimize' | 'onToggleMaximize'>) {
  return (
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
      <button type="button" className="window-button danger" onClick={onClose} aria-label="Close">
        <span className="window-icon close" aria-hidden="true" />
      </button>
    </div>
  );
}
