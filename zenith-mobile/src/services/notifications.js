import * as Notifications from 'expo-notifications';

const SOUND = '376749__zenithinfinitivestudios__fantasy_ui_button_5.wav';

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

export async function scheduleNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 9 AM — nudge to start the first session of the day
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Zenith',
      body: "Start your first session for today. Your skill tree is waiting.",
      sound: SOUND,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  // 8 PM — streak save reminder
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Zenith',
      body: "Don't lose your streak. Complete a session before midnight.",
      sound: SOUND,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}
