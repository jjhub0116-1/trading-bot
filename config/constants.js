// Centralized constants — eliminates magic strings across the codebase
module.exports = {
    ORDER_STATUS: {
        OPEN: 'OPEN',
        EXECUTED: 'EXECUTED',
        CANCELLED: 'CANCELLED',
        CANCELLED_BY_MARGIN_CALL: 'CANCELLED_BY_MARGIN_CALL'
    },
    ORDER_SIDE: { BUY: 'BUY', SELL: 'SELL' },
    ORDER_TYPE: { MARKET: 'MARKET', LIMIT: 'LIMIT' }
};
