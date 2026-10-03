// localStorage can be blocked (private window, cleared site data), so every access is guarded.
export function readSetting(key) {
    try {
        return localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
export function writeSetting(key, value) {
    try {
        localStorage.setItem(key, value);
    }
    catch {
        // not saved, the page still works
    }
}
export function removeSetting(key) {
    try {
        localStorage.removeItem(key);
    }
    catch {
        // nothing stored or storage blocked
    }
}
