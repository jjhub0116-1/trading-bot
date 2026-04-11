const Portfolio = require('../models/Portfolio');

async function updatePortfolio(userId, username, stockId, executedQuantity, executionPrice, side, lotMultiplier = 1) {
  try {
    let portfolio = await Portfolio.findOne({ user_id: userId });

    if (!portfolio) {
      portfolio = new Portfolio({ user_id: userId, user_name: username, positions: [], realized_pnl: 0 });
    }

    let position = portfolio.positions.find(p => p.stock_id === stockId);
    let realizedPnl = 0;

    if (side === 'BUY') {
      if (!position) {
        // No position — open a fresh long
        portfolio.positions.push({ stock_id: stockId, net_quantity: executedQuantity, average_price: executionPrice, realized_pnl: 0 });
      } else if (position.net_quantity < 0) {
        // Currently SHORT — buying to cover/close
        const closingQty = Math.min(executedQuantity, Math.abs(position.net_quantity));
        realizedPnl = (position.average_price - executionPrice) * closingQty * lotMultiplier; // Inverted P&L for shorts + lot math
        position.net_quantity += executedQuantity;
        position.realized_pnl += realizedPnl;
        portfolio.realized_pnl = (portfolio.realized_pnl || 0) + realizedPnl;
        if (position.net_quantity > 0) {
          position.average_price = executionPrice; // Crossed zero — now long on excess
        } else if (position.net_quantity === 0) {
          portfolio.positions = portfolio.positions.filter(p => p.stock_id !== stockId);
        }
      } else {
        // Already LONG — weighted average update
        const totalCost = (position.net_quantity * position.average_price) + (executedQuantity * executionPrice);
        position.net_quantity += executedQuantity;
        position.average_price = totalCost / position.net_quantity;
      }

    } else if (side === 'SELL') {
      if (!position) {
        // No position — open a fresh SHORT
        portfolio.positions.push({ stock_id: stockId, net_quantity: -executedQuantity, average_price: executionPrice, realized_pnl: 0 });
      } else if (position.net_quantity > 0) {
        // Currently LONG — selling, possibly going short on the excess
        const closingQty = Math.min(executedQuantity, position.net_quantity);
        realizedPnl = (executionPrice - position.average_price) * closingQty * lotMultiplier; // Lot math
        position.net_quantity -= executedQuantity;
        position.realized_pnl += realizedPnl;
        portfolio.realized_pnl = (portfolio.realized_pnl || 0) + realizedPnl;
        if (position.net_quantity < 0) {
          position.average_price = executionPrice; // Crossed zero — now short on excess
        } else if (position.net_quantity === 0) {
          portfolio.positions = portfolio.positions.filter(p => p.stock_id !== stockId);
        }
      } else {
        // Already SHORT — deepening it (weighted avg)
        const totalCost = (Math.abs(position.net_quantity) * position.average_price) + (executedQuantity * executionPrice);
        position.net_quantity -= executedQuantity;
        position.average_price = totalCost / Math.abs(position.net_quantity);
      }
    }

    portfolio.markModified('positions');
    await portfolio.save();
    console.log(`📦 Portfolio updated for ${username} (Stock: ${stockId}, Side: ${side})`);
  } catch (error) {
    console.error('Update Portfolio Error:', error);
  }
}

module.exports = { updatePortfolio };