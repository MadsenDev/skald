import { Icon } from '../ui/icons';
import { Logo } from '../ui/logo';
import { api } from '../api';
import { useStore } from '../store';

export function TitleBar() {
  const snapshot = useStore((s) => s.snapshot);
  const setSwitcherOpen = useStore((s) => s.setSwitcherOpen);
  const setView = useStore((s) => s.setView);
  const settings = snapshot?.settings;
  const initials = (snapshot?.vaultName ?? 'SK').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'SK';

  const toggleMargin = () => {
    if (settings) void api.setSettings({ marginOn: !settings.marginOn });
  };

  return (
    <header className="titlebar">
      <div className="titlebar__l">
        <div className="traffic">
          <span title="Close" onClick={() => void api.closeWindow()} />
          <span title="Minimize" onClick={() => void api.minimize()} />
          <span title="Maximize" onClick={() => void api.toggleMaximize()} />
        </div>
        <div className="titlebar__brand">
          <Logo size={19} variant={settings?.logoVariant ?? 'sigil'} withText />
        </div>
      </div>

      <button className="cmdbar" onClick={() => setSwitcherOpen(true)} title="Search — ⌘K">
        <Icon name="search" size={14} />
        <span className="cmdbar__txt">Search notes, tasks, commands</span>
        <span className="cmdbar__kbd">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </span>
      </button>

      <div className="titlebar__r">
        <button
          className={'ic-btn' + (settings?.marginOn ? ' is-on' : '')}
          title="Toggle right panel — ⌘B"
          onClick={toggleMargin}
        >
          <Icon name="panelRight" size={15} />
        </button>
        <button className="ic-btn" title="Settings" onClick={() => setView('settings')}>
          <Icon name="gear" size={15} />
        </button>
        <div className="avatar" title={snapshot?.vaultPath}>{initials}</div>
      </div>
    </header>
  );
}
