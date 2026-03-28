const { initSheets } = require("./config/sheetsClient");
const { signup, login } = require("./modules/auth");
//const { getSheetsInstance } = require("../config/sheetsClient");

//async function main() {
//  try {
//    // ✅ Initialize Google Sheets ONCE
//    await initSheets();
//
//    // ✅ Call your function from here
//    const result = await signup(
//      "John Doe",
//      "john@example.com",
//      "123456"
//    );
//
//    console.log(result);
//
//  } catch (error) {
//    console.error("App Error:", error);
//  }
//}

//async function main() {
//  try {
//    // ✅ Initialize Google Sheets ONCE
//    await initSheets();
//
//    // ✅ Call your function from here
//    const result = await login(
//      "john@example.com",
//      "123456"
//    );
//
//    console.log(result);
//
//  } catch (error) {
//    console.error("App Error:", error);
//  }
//}

//async function main() {
//  try {
//    // ✅ Initialize Google Sheets ONCE
//    await initSheets();
//
//    // ✅ Call your function from here
//    const result = await login(
//      "john@example.com",
//      "123456"
//    );
//
//    console.log(result);
//
//  } catch (error) {
//    console.error("App Error:", error);
//  }
//}
//
//main();

//const { initSheets } = require("./config/sheetsClient");
const { placeOrder } = require("./modules/order");

async function main() {
  try {
    await initSheets();

    const orderId = await placeOrder(
      1,
      1,
      10,
      "MARKET",
      100,
      95,
      110,
      "BUY"
    );

    console.log("Order Result:", orderId);

  } catch (error) {
    console.error(error);
  }
}

main();