// Journal entries ko localStorage mein save/load/delete karte hain
// Simple aur centralized – component se directly localStorage nahi chhuna chahiye

const JOURNAL_KEY = "wildwise_journal";
const QUESTS_KEY = "wildwise_quests";

/** Journal mein ek naya entry add karta hai. */
export function saveJournalEntry(entry) {
  const entries = getJournalEntries();
  const newEntry = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  entries.unshift(newEntry); // Latest pehle
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
  return newEntry;
}

/** Saari journal entries laata hai, malformed data safely handle karta hai. */
export function getJournalEntries() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // Agar corrupt data hai toh fresh start
    return [];
  }
}

/** Ek entry delete karta hai by ID. */
export function deleteJournalEntry(id) {
  const entries = getJournalEntries().filter((e) => e.id !== id);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries));
}

/** Current quest progress save karta hai (title, challenges, observations, completions). */
export function saveQuestProgress(questData) {
  localStorage.setItem(QUESTS_KEY, JSON.stringify(questData));
}

/** Pichla quest progress restore karta hai. */
export function loadQuestProgress() {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Quest progress clear karta hai (naya quest start hone pe). */
export function clearQuestProgress() {
  localStorage.removeItem(QUESTS_KEY);
}

const PREFERENCES_KEY = "wildwise_user_preferences";
const OFFLINE_MODE_KEY = "wildwise_offline_mode";

/** User preferences save karta hai (environment, duration, interests, difficulty). */
export function saveUserPreferences(prefs) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // LocalStorage quota issues safely ignore
  }
}

/** Pichli user preferences load karta hai. */
export function loadUserPreferences() {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Offline mode toggle value padhta hai (defaults to true for safety & offline-first). */
export function getOfflineMode() {
  try {
    const raw = localStorage.getItem(OFFLINE_MODE_KEY);
    // Default to true (offline-first, no unexpected costs) unless explicitly disabled
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

/** Offline mode toggle value save karta hai. */
export function setOfflineMode(enabled) {
  try {
    localStorage.setItem(OFFLINE_MODE_KEY, String(enabled));
  } catch {
    // Ignore storage failure
  }
}
