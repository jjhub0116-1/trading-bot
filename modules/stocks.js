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
      stock_id: s.stock_id,
      symbol: s.symbol,
      stock_name: s.stock_name,
      current_price: s.current_price,
      asset_type: s.asset_type || 'STOCK',
      lot_size: s.lot_size || 1,
      fiftyTwoWeekHigh: s.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: s.fiftyTwoWeekLow,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      previousClose: s.previousClose,
      open: s.open
    }));
  } catch (err) {
    return [];
  }
}

module.exports = { getStock, getAllStocks };