// Notification permission + helper for tab-hidden push.
// The Firestore onSnapshot listener keeps running even when the tab is
// backgrounded, so we can fire a Notification directly from the listener.

export function requestNotificationPermission(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function showNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  // Only notify when the tab is not focused
  if (typeof document !== 'undefined' && !document.hidden) return;
  try {
    new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: 'ventspace-message', // collapses rapid messages into one notification
    });
  } catch {
    // Ignore — some browsers block Notification outside a SW context
  }
}
