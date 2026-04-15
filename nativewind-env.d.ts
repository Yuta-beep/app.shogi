/// <reference types="nativewind/types" />

/** Expo で flushSync を使うため（@types/react-dom は peer と競合しがちなので最小宣言のみ） */
declare module 'react-dom' {
  export function flushSync<R>(fn: () => R): R;
}
