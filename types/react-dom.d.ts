// Minimal shim for react-dom — we only use createPortal, and only on web.
// Avoids a full @types/react-dom dependency which could drift from React 19.
declare module 'react-dom' {
  import type { ReactNode } from 'react';
  export function createPortal(children: ReactNode, container: Element | DocumentFragment): ReactNode;
}
