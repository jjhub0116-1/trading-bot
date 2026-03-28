import gspread
from google.oauth2.service_account import Credentials

# Define scope
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

# Authenticate
creds = Credentials.from_service_account_file(
    "credentials.json",
    scopes=SCOPES
)

client = gspread.authorize(creds)

# Create spreadsheet
spreadsheet = client.open_by_key("1w8olr1fKmhAYg_7NomPwo33vu_7NHLsWyJb-RpoK7H8")

print("Spreadsheet created:", spreadsheet.url)

# Define tables with headers and sample rows
tables = {

    "Users": [
        ["id", "name", "email", "password", "wallet_balance", "created_at"],
        [1, "Rahul", "rahul@test.com", "hashed_password", 100000, "2026-03-16"],
        [2, "Amit", "amit@test.com", "hashed_password", 50000, "2026-03-16"]
    ],

    "Stocks": [
        ["id", "symbol", "name", "price", "daily_change", "market_status"],
        [1, "AAPL", "Apple Inc", 182.5, 1.2, "OPEN"],
        [2, "TSLA", "Tesla Inc", 240.7, -0.5, "OPEN"]
    ],

    "Orders": [
        ["id", "user_id", "stock_id", "side", "order_type", "quantity", "price", "status"],
        [1, 1, 1, "BUY", "MARKET", 10, 182.5, "EXECUTED"],
        [2, 2, 2, "BUY", "LIMIT", 5, 235, "OPEN"]
    ],

    "Portfolio": [
        ["id", "user_id", "stock_id", "quantity", "avg_buy_price"],
        [1, 1, 1, 10, 182.5],
        [2, 2, 2, 5, 235]
    ],

    "Trades": [
        ["id", "user_id", "order_id", "stock_id", "side", "quantity", "execution_price", "total_value"],
        [1, 1, 1, 1, "BUY", 10, 182.5, 1825],
        [2, 2, 2, 2, "BUY", 5, 235, 1175]
    ],

    "WalletTransactions": [
        ["id", "user_id", "amount", "type", "reason", "status"],
        [1, 1, 1825, "DEBIT", "BUY_ORDER", "COMPLETED"],
        [2, 2, 1175, "DEBIT", "BUY_ORDER", "COMPLETED"]
    ]
}

# Create sheets and insert data
for sheet_name, data in tables.items():

    try:
        sheet = spreadsheet.add_worksheet(
            title=sheet_name,
            rows="100",
            cols="20"
        )
    except:
        sheet = spreadsheet.worksheet(sheet_name)

    sheet.update(data)

    print(f"{sheet_name} sheet created with sample data")

# Remove default Sheet1 if exists
try:
    default_sheet = spreadsheet.worksheet("Sheet1")
    spreadsheet.del_worksheet(default_sheet)
except:
    pass

print("All sheets created successfully!")