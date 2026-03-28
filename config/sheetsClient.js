const { google } = require("googleapis");

let sheetsInstance = null;
let authClient = null;

async function initSheets() {
  if (sheetsInstance) {
    return sheetsInstance;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "credentials.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    authClient = await auth.getClient();

    sheetsInstance = google.sheets({
      version: "v4",
      auth: authClient,
    });

    console.log("✅ Google Sheets connection initialized");

    return sheetsInstance;
  } catch (error) {
    console.error("❌ Error initializing Google Sheets:", error);
    throw error;
  }
}


function getAuthClient() {
  if (!authClient) {
    throw new Error("Sheets not initialized. Call initSheets() first.");
  }
  return authClient;
}

module.exports = {
  initSheets,
  getAuthClient,
};