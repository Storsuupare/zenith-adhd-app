-- V5 — Upfront Staking: record the BW staked at task creation
-- Run once before starting the server with upfront staking enabled.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS staked_bw NUMERIC NOT NULL DEFAULT 0;
