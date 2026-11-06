import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set default notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from device
 */
export async function registerForPushNotificationsAsync() {
  let token;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      } catch (channelErr) {
        // Handled gracefully in Expo Go
      }
    }

    return true;
  } catch (err) {
    console.log('Error registering notifications:', err);
    return null;
  }
}

/**
 * Trigger an immediate notification when a new startup deal arrives
 */
export async function triggerStartupAlert(startupName, raisedAmount, minTicket) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚀 New Unicorn Alert: ${startupName}`,
        body: `${startupName} raised ${raisedAmount}! Community round open from ${minTicket} 💰`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // trigger immediately
    });
  } catch (err) {
    console.log('Error triggering notification:', err);
  }
}
