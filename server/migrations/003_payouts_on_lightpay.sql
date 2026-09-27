-- Sales are paid into the seller's LightPay wallet (withdrawals happen on LightPay):
-- Salacope no longer keeps a payout number.
ALTER TABLE merchants DROP COLUMN payout_channel;
ALTER TABLE merchants DROP COLUMN payout_phone;
