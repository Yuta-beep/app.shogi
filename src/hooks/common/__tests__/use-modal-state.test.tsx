import { act, renderHook } from '@testing-library/react-native';

import { useModalState } from '@/hooks/common/use-modal-state';

describe('useModalState', () => {
  it('opens with payload and closes by resetting state', () => {
    const { result } = renderHook(() => useModalState<string>());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.payload).toBeNull();

    act(() => {
      result.current.open('piece-1');
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.payload).toBe('piece-1');

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it('can open without payload', () => {
    const { result } = renderHook(() => useModalState<string>());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.payload).toBeNull();
  });
});
