import { useCallback, useState } from 'react';

export type ModalState<T> = {
  isOpen: boolean;
  payload: T | null;
  open: (payload?: T) => void;
  close: () => void;
};

export function useModalState<T = void>(): ModalState<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<T | null>(null);

  const open = useCallback((nextPayload?: T) => {
    setPayload(nextPayload ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);

  return { isOpen, payload, open, close };
}
