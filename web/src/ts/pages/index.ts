import { getFetchResponse } from "../utils/apiHelpers.js";



async function initializeApp(): Promise<void> {
    await getFetchResponse("/run/testCsvNew");
}

document.addEventListener("DOMContentLoaded", initializeApp);