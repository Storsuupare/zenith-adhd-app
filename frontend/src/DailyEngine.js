const todayKey = (userId) =>
  "zenith_daily_" + (userId || "anon") + "_" + new Date().toISOString().slice(0, 10);

export const getRecord = (userId) => {
  try { return JSON.parse(localStorage.getItem(todayKey(userId)) || "[]"); }
  catch { return []; }
};

export const signal = (data, userId) => {
  try {
    const record = getRecord(userId);
    record.push({ ts: Date.now(), ...data });
    localStorage.setItem(todayKey(userId), JSON.stringify(record));
  } catch { /* private mode or quota exceeded — degrade silently */ }
};
