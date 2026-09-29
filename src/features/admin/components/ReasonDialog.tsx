import React, { useEffect, useState } from 'react';
import { Button, Dialog, Field, Textarea, buttonClass } from '@/shared/ui';

/**
 * Confirms an administrator action and asks why (kept in the log, and shown to the seller when
 * it concerns them). `optional`: the reason may be left empty (e.g. approving).
 */
export const ReasonDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  label?: string;
  confirmLabel: string;
  danger?: boolean;
  optional?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}> = ({ open, onClose, title, description, label = 'Raison', confirmLabel, danger, optional, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setReason('');
      setError(undefined);
    }
  }, [open]);

  const confirm = async () => {
    if (!optional && reason.trim().length < 5) return setError('Indiquez la raison (5 caractères minimum).');
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      dismissible={!busy}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className={buttonClass('secondary')}>
            Retour
          </button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} optional={optional} error={error}>
        {(id) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
    </Dialog>
  );
};
