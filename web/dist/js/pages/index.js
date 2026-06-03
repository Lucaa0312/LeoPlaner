import { getFetchResponse } from "../utils/apiHelpers.js";
async function initializeApp() {
    await getFetchResponse("/run/testCsvNew");
}
document.addEventListener("DOMContentLoaded", initializeApp);
