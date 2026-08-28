const pool = require("./db.js");
const { webpush } = require("./clients.js");

async function sendPushToUser(userId, payload) {
  const subs = await pool.query(
    "SELECT subscription FROM push_subscriptions WHERE user_id = $1",
    [userId],
  );
  const sends = subs.rows.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(payload));
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pool.query(
          "DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1",
          [row.subscription.endpoint],
        ).catch(() => {});
      }
    }
  });
  await Promise.allSettled(sends);
}

// Sends a push notification to all Expo push tokens registered for a user
async function sendExpoPushToUser(userId, payload) {
  const tokenRes = await pool.query(
    "SELECT token FROM expo_push_tokens WHERE user_id = $1",
    [userId],
  );
  if (!tokenRes.rows.length) return;

  const messages = tokenRes.rows.map((row) => ({
    to:    row.token,
    title: payload.title,
    body:  payload.body,
    sound: "default",
    data:  payload.data ?? {},
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body:    JSON.stringify(messages),
    });
    const result = await response.json();

    // Clean up invalid tokens
    const data = Array.isArray(result.data) ? result.data : [result.data];
    for (let i = 0; i < data.length; i++) {
      if (data[i]?.details?.error === "DeviceNotRegistered") {
        await pool.query(
          "DELETE FROM expo_push_tokens WHERE token = $1",
          [messages[i].to],
        ).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Expo push error:", err.message);
  }
}

module.exports = { sendPushToUser, sendExpoPushToUser };
