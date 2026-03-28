const { initSheets } = require("../config/sheetsClient");

async function readSomething() {
  const sheets = await initSheets();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: "YOUR_SHEET_ID",
    range: "Sheet1!A1:B10",
  });

  return res.data.values;
}