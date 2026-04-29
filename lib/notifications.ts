import * as Notifications from 'expo-notifications';

export type NotificationStatus = 'granted' | 'denied' | 'undetermined';

export async function getNotificationStatus(): Promise<NotificationStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestNotificationPermissions(): Promise<NotificationStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  // On Android 13+ this triggers the runtime POST_NOTIFICATIONS prompt.
  // On older Android, permission is implicit and we still get 'granted'.
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}
