const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');

async function checkWalletBalance(userId, requiredAmount) {
  try {
    const user = await User.findOne({ user_id: userId });
    return user && user.total_balance >= requiredAmount;
  } catch (error) {
    console.error("Check Wallet Error:", error);
    return false;
  }
}

async function updateWallet(userId, username, amount, stockId, side) {
  try {
    const value = side === 'BUY' ? -amount : amount;

    await User.findOneAndUpdate(
      { user_id: userId },
      { $inc: { total_balance: value } }
    );

    const transactionId = "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    await WalletTransaction.create({
      transaction_id: transactionId,
      user_id: userId,
      user_name: username,
      amount: amount,
      stock_id: stockId,
      side: side
    });

    console.log(`💰 Wallet updated for User: ${userId}. Amount: ${value}`);
  } catch (error) {
    console.error("Update Wallet Error:", error);
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

module.exports = { checkWalletBalance, updateWallet, getUserName };