const Stock = require('../models/Stock');

async function getStock(stockId) {
  try {
    const stock = await Stock.findOne({ stock_id: stockId });
    return stock ? {
      id: stock.stock_id,
      symbol: stock.symbol,
      name: stock.stock_name,
      price: stock.current_price,
      lot_size: stock.lot_size || 1,
      asset_type: stock.asset_type || 'STOCK'
    } : null;
  } catch (err) {
    return null;
  }
}

async function getAllStocks() {
  try {
    const stocks = await Stock.find({});
    return stocks.map(s => ({
      id: s.stock_id,
      symbol: s.symbol,
      name: s.stock_name,
      price: s.current_price
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { getStock, getAllStocks };