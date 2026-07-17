import { useEffect, useState } from 'react';
import { Logo } from '../ui/logo';
import { api } from '../api';
import { useStore } from '../store';

export function VaultPicker() {
  const openVaultAt = useStore((s) => s.openVaultAt);
  const [last, setLast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.getLastVault().then(setLast);
  }, []);

  const pick = async (create: boolean) => {
    setError(null);
    const path = await api.selectVaultDialog();
    if (!path) return;
    setBusy(true);
    try {
      await openVaultAt(path, create);
    } catch (err) {
      setError(String((err as Error).message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vault-picker">
      <div className="vault-picker__card">
        <div className="vault-picker__logo">
          <Logo size={44} variant="sigil" />
        </div>
        <h1>Skald</h1>
        <p className="lede">
          A vault is a folder of plain Markdown files. Open one you already have — from Obsidian or
          anywhere else — or start a new saga.
        </p>
        <div className="vault-picker__actions">
          <button className="btn btn--accent" disabled={busy} onClick={() => void pick(false)}>
            Open a vault folder…
          </button>
          <button className="btn" disabled={busy} onClick={() => void pick(true)}>
            Create a new vault…
          </button>
        </div>
        {last && (
          <div className="vault-picker__last">
            last:{' '}
            <button
              onClick={() => {
                setBusy(true);
                void openVaultAt(last, false).finally(() => setBusy(false));
              }}
            >
              {last}
            </button>
          </div>
        )}
        {error && <div className="dialog__error">{error}</div>}
      </div>
    </div>
  );
}
