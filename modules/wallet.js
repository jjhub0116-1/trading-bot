const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Portfolio = require('../models/Portfolio');

async function checkEquityAvailable(userId, requiredQuantity) {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) return false;

    // New schema: one portfolio doc per user with embedded positions[]
    const portfolio = await Portfolio.findOne({ user_id: userId });
    let currentTotalShares = 0;
    if (portfolio) {
      portfolio.positions.forEach(p => {
        currentTotalShares += Math.abs(p.net_quantity); // Count both long AND short exposure
      });
    }

    // Reject if total shares held + new order would exceed equity limit
    return (currentTotalShares + requiredQuantity) <= user.equity;
  } catch (error) {
    console.error("Equity check error:", error);
    return false;
  }
}

async function logTransaction(userId, username, amount, stockId, side, quantity) {
  try {
    const transactionId = "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await WalletTransaction.create({
      transaction_id: transactionId,
      user_id: userId,
      user_name: username,
      amount: amount,
      stock_id: stockId,
      quantity: quantity,
      side: side
    });
  } catch (error) {
    console.error("Transaction log error:", error);
  }
}

async function getUserName(userId) {
  try {
    const user = await User.findOne({ user_id: userId });
    return user ? user.user_name : "Unknown";
  } catch (err) {
    return "Unknown";
  }
}

module.exports = { checkEquityAvailable, logTransaction, getUserName };