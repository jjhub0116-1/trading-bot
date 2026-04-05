const Portfolio = require('../models/Portfolio');

async function updatePortfolio(userId, username, stockId, executedQuantity, executionPrice, side) {
  try {
    let portfolio = await Portfolio.findOne({ user_id: userId });

    if (!portfolio) {
      if (side === 'SELL') return;
      portfolio = new Portfolio({
        user_id: userId,
        user_name: username,
        positions: [],
        realized_pnl: 0
      });
    }

    let position = portfolio.positions.find(p => p.stock_id === stockId);

    if (side === 'BUY') {
      if (!position) {
        portfolio.positions.push({ stock_id: stockId, net_quantity: executedQuantity, average_price: executionPrice, realized_pnl: 0 });
      } else {
        const totalCost = (position.net_quantity * position.average_price) + (executedQuantity * executionPrice);
        position.net_quantity += executedQuantity;
        position.average_price = totalCost / position.net_quantity;
      }
    } else if (side === 'SELL') {
      if (!position || position.net_quantity <= 0) return;

      const qtyToSell = Math.min(executedQuantity, position.net_quantity);
      const realizedPnl = (executionPrice - position.average_price) * qtyToSell;

      position.net_quantity -= qtyToSell;
      position.realized_pnl += realizedPnl;

      // Prune zero-quantity positions — prevents indefinite array growth
      if (position.net_quantity <= 0) {
        portfolio.positions = portfolio.positions.filter(p => p.stock_id !== stockId);
      }

      // Accumulate realized P&L across the portfolio permanently
      portfolio.realized_pnl = (portfolio.realized_pnl || 0) + realizedPnl;
    }

    portfolio.markModified('positions');
    await portfolio.save();

    console.log(`📦 Portfolio updated for ${username} (Stock: ${stockId}, Side: ${side})`);
  } catch (error) {
    console.error('Update Portfolio Error:', error);
  }
}

module.exports = { updatePortfolio };