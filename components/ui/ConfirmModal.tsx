"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertTriangleIcon } from "@/components/ui/icons";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} ariaLabel={title} hideCloseButton>
      <div className="flex flex-col items-center text-center">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning">
          <AlertTriangleIcon />
        </div>

        <h2 className="pt-4 text-[22px] font-extrabold leading-8 text-modal-text">{title}</h2>

        <p className="max-w-[300px] pt-2 text-[13px] font-semibold leading-5 text-modal-subtext">
          {description}
        </p>

        <div className="flex w-full flex-col gap-3 pt-8 sm:flex-row">
          <Button variant="secondary" className="sm:flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" className="sm:flex-1" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
