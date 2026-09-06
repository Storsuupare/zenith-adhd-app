import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const SOUND   = '833599__subquire__bright-synth-ping-ui-bell-tone.wav';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Sends the Expo push token to the backend so the server can send
// personalised notifications (streak alerts, weekly summary, etc.)
export async function registerPushToken(clerkJwt) {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const timezone  = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    await fetch(`${API_BASE}/api/push/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkJwt}`,
      },
      body: JSON.stringify({ token: tokenData.data, timezone }),
    });
  } catch {
    // Silently ignore — simulators and permission-denied cases both land here
  }
}

const sessionCompleteNotificationIds = new Map();

export async function scheduleSessionCompleteNotification(taskId, deadline) {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Session complete',
        body: 'Come collect your reward before it disappears.',
        sound: SOUND,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(deadline),
      },
    });
    sessionCompleteNotificationIds.set(String(taskId), identifier);
  } catch {
    // Best-effort -- a scheduling failure shouldn't block starting the session
  }
}

export async function cancelSessionCompleteNotification(taskId) {
  const identifier = sessionCompleteNotificationIds.get(String(taskId));
  if (!identifier) return;
  sessionCompleteNotificationIds.delete(String(taskId));
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Already fired or already cancelled -- fine either way
  }
}

export async function scheduleNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 9 AM — daily challenge prompt
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Zenith',
      body: 'Daily challenge is live! 🎯 Complete it before midnight for bonus credits.',
      sound: SOUND,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

}
