const Portfolio = require('../models/Portfolio');

async function updatePortfolio(userId, username, stockId, executedQuantity, executionPrice, side) {
  try {
    // Find or create the single portfolio document for this user
    let portfolio = await Portfolio.findOne({ user_id: userId });

    if (!portfolio) {
      if (side === "SELL") return; // Nothing to sell
      portfolio = new Portfolio({
        user_id: userId,
        user_name: username,
        positions: [],
        profit_loss: 0
      });
    }

    // Find the position entry for this specific stock
    let position = portfolio.positions.find(p => p.stock_id === stockId);

    if (side === "BUY") {
      if (!position) {
        // New position for this stock
        portfolio.positions.push({
          stock_id: stockId,
          net_quantity: executedQuantity,
          average_price: executionPrice,
          realized_pnl: 0
        });
      } else {
        // Add to existing position — recalculate weighted average price
        const totalCost = (position.net_quantity * position.average_price) + (executedQuantity * executionPrice);
        const newQuantity = position.net_quantity + executedQuantity;
        position.average_price = totalCost / newQuantity;
        position.net_quantity = newQuantity;
      }
    } else if (side === "SELL") {
      if (!position || position.net_quantity <= 0) return; // Nothing to sell

      const qtyToSell = Math.min(executedQuantity, position.net_quantity);
      const realizedPnl = (executionPrice - position.average_price) * qtyToSell;

      position.net_quantity -= qtyToSell;
      position.realized_pnl += realizedPnl;

      // Aggregate profit_loss across ALL positions
      portfolio.profit_loss = portfolio.positions.reduce((sum, p) => sum + p.realized_pnl, 0);
    }

    // Mark positions as modified (required for Mongoose subdoc arrays)
    portfolio.markModified('positions');
    await portfolio.save();

    console.log(`📦 Portfolio updated for ${username} (Stock: ${stockId}, Side: ${side})`);

  } catch (error) {
    console.error("Update Portfolio Error:", error);
  }
}

module.exports = { updatePortfolio };