const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const Portfolio = require('../models/Portfolio');

async function checkEquityAvailable(userId, requiredAmount) {
  try {
    const user = await User.findOne({ user_id: userId });
    if (!user) return false;

    // Dynamically calculate the mathematically exact exposure of all current active asset holds natively.
    const holdings = await Portfolio.find({ user_id: userId });
    let currentExposure = 0;
    holdings.forEach(h => {
      if (h.net_quantity > 0) {
        currentExposure += (h.average_price * h.net_quantity);
      }
    });

    // You cannot buy if your current exposed deployed capital plus this order exceeds your global structural algorithmic limit.
    return (currentExposure + requiredAmount) <= user.equity;
  } catch (error) {
    console.error("Check Equity Limits Security Risk Fault:", error);
    return false;
  }
}

async function logTransaction(userId, username, amount, stockId, side) {
  try {
    // We maintain the literal ledger so they still formally safely see an audit history natively.
    const transactionId = "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await WalletTransaction.create({
      transaction_id: transactionId,
      user_id: userId,
      user_name: username,
      amount: amount,
      stock_id: stockId,
      side: side
    });
  } catch (error) {
    console.error("Ledger Logger Fault Exception organically handled:", error);
  }
}

async function getUserName(userId) {
  try {
    const user = await User.findOne({ user_id: userId });
    return user ? user.user_name : "Unknown User";
  } catch (err) {
    return "Unknown User";
  }
}

module.exports = { checkEquityAvailable, logTransaction, getUserName };