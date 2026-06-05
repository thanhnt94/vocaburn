export function triggerHaptic(type: 'success' | 'error' | 'warning') {
  if (typeof window !== 'undefined' && typeof window.navigator.vibrate === 'function') {
    try {
      if (type === 'success') {
        window.navigator.vibrate(40);
      } else if (type === 'error') {
        window.navigator.vibrate([50, 50, 50]);
      } else if (type === 'warning') {
        window.navigator.vibrate([30, 30]);
      }
    } catch (e) {
      console.warn("Haptic feedback vibration failed:", e);
    }
  }
}
