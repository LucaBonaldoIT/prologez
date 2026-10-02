// localStorage wrapper that never throws (private windows, blocked storage, ...).
const PREFIX = 'plnb:';

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function removeAll(startsWith) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX + startsWith))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
