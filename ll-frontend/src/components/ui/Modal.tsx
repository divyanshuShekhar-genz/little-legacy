import { useEffect, useRef, type ReactNode } from 'react';

/** Native <dialog> modal, matching the prototype's dialog styling. */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="max-h-[90vh] w-[780px] max-w-[94vw] overflow-auto rounded-dialog border border-line p-[30px] shadow-dialog backdrop:bg-[#27203166]"
    >
      {open && (
        <>
          <h2 className="mb-[18px]">{title}</h2>
          {children}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2.5">{footer}</div>}
        </>
      )}
    </dialog>
  );
}
