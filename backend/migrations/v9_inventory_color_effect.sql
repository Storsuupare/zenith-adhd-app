-- v9_inventory_color_effect.sql
-- Adds color_hex and effect_value columns to inventory.
-- color_hex drives rarity color rendering in InventoryItem, StatHUD perk-dots, and LootDisplay.
-- effect_value is the human-readable effect label stored alongside the item.
-- Safe to run multiple times (IF NOT EXISTS guard).

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS color_hex    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS effect_value TEXT;
