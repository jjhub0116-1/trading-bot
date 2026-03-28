const { initSheets } = require("./config/sheetsClient");

const SPREADSHEET_ID = "1w8olr1fKmhAYg_7NomPwo33vu_7NHLsWyJb-RpoK7H8";

async function setupSheets() {
    try {
        const sheets = await initSheets();

        const clearRanges = [
            "Users!A1:Z",
            "Stocks!A1:Z",
            "Orders!A1:Z",
            "Portfolio!A1:Z",
            "WalletTransactions!A1:Z",
            "Trades!A1:Z"
        ];

        console.log("🧹 Clearing sheets natively...");
        await sheets.spreadsheets.values.batchClear({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: { ranges: clearRanges }
        });

        const data = [
            {
                range: "Users!A1:F3",
                values: [
                    ["user_id", "user_name", "email", "password", "total_balance", "lot_limit"],
                    ["1", "Rahul", "rahul@test.com", "hashed", "100000", "0"],
                    ["2", "smriti", "smriti@test.com", "hashed", "100000", "10"]
                ]
            },
            {
                range: "Stocks!A1:D2",
                values: [
                    ["stock_id", "symbol", "stock_name", "current_price"],
                    ["1", "AAPL", "Apple Inc", "200"] // AAPL is at 200
                ]
            },
            {
                range: "Orders!A1:K1", // Expanded to K to include Stop Loss / Target natively!
                values: [
                    ["order_id", "user_id", "user_name", "stock_id", "side", "order_type", "quantity", "price", "stop_loss", "target", "status"]
                ]
            },
            {
                range: "Portfolio!A1:F1",
                values: [
                    ["user_id", "user_name", "stock_id", "net_quantity", "average_price", "profit_loss"]
                ]
            },
            {
                range: "WalletTransactions!A1:G1",
                values: [
                    ["transaction_id", "user_id", "user_name", "amount", "stock_id", "side", "timestamp"]
                ]
            },
            {
                range: "Trades!A1:I1",
                values: [
                    ["trade_id", "order_id", "user_id", "user_name", "stock_id", "side", "quantity", "execution_price", "total_cost"]
                ]
            }
        ];

        console.log("📝 Writing 11 columns effectively for Orders + TRADES...");
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                valueInputOption: "RAW",
                data: data
            }
        });

        console.log("✅ Custom bracket 11-column unified format completed!");
    } catch (error) {
        console.error("Setup Error:", error);
    }
}

setupSheets();
