const { initSheets } = require("../config/sheetsClient");

const SPREADSHEET_ID = "1w8olr1fKmhAYg_7NomPwo33vu_7NHLsWyJb-RpoK7H8";

// READ
async function readSheet(range) {
  const sheets = await initSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });

  return res.data.values || [];
}

// WRITE
async function writeSheet(range, values) {
  const sheets = await initSheets();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// APPEND
async function appendSheet(range, values) {
  const sheets = await initSheets();

  console.log("***************************************")

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

module.exports = {
  readSheet,
  writeSheet,
  appendSheet,
};