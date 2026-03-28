const Portfolio = require('../models/Portfolio');

async function updatePortfolio(userId, username, stockId, executedQuantity, executionPrice, side) {
  try {
    let position = await Portfolio.findOne({ user_id: userId, stock_id: stockId });

    if (!position) {
      if (side === "SELL") return;
      position = new Portfolio({
        user_id: userId,
        user_name: username,
        stock_id: stockId,
        net_quantity: executedQuantity,
        average_price: executionPrice,
        profit_loss: 0
      });
      await position.save();
      return;
    }

    if (side === "BUY") {
      const totalCost = (position.net_quantity * position.average_price) + (executedQuantity * executionPrice);
      const newQuantity = position.net_quantity + executedQuantity;
      const newAverage = totalCost / newQuantity;

      position.net_quantity = newQuantity;
      position.average_price = newAverage;
    }
    else if (side === "SELL") {
      const newQuantity = position.net_quantity - executedQuantity;
      const realizedProfit = (executionPrice * executedQuantity) - (position.average_price * executedQuantity);

      position.net_quantity = newQuantity;
      position.profit_loss += realizedProfit;
    }

    await position.save();
    console.log(`📦 Portfolio strict schema mathematically mapped securely to ${username} (Stock: ${stockId})`);

  } catch (error) {
    console.error("Update Portfolio Error:", error);
  }
}

module.exports = { updatePortfolio };