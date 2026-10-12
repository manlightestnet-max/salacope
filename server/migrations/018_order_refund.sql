-- What the buyer really got back when an order was cancelled: a mobile-money payer is refunded to their number minus the
-- payout fees (operator + LightPay); a LightPay-wallet payer is refunded in full. { paid, sent, operatorFee, lightpayFee, via, at }
ALTER TABLE orders ADD COLUMN refund JSONB;
