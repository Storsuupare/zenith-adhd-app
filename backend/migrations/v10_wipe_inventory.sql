-- v10_wipe_inventory.sql
-- Wipes all inventory rows clean before the perk system redesign.
-- Run this ONCE manually. It cannot be undone.

DELETE FROM inventory;
