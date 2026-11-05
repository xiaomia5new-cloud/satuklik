-- satuklik D1 relational schema. Paste in Cloudflare Dashboard > D1 > satuklik > Console.
-- Current app store also uses satuklik_data; these typed tables are designed for migration.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS licenses (
  license_hash TEXT PRIMARY KEY,
  uid TEXT,
  device_id TEXT,
  is_revoked INTEGER NOT NULL DEFAULT 0 CHECK (is_revoked IN (0,1)),
  tail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (uid) REFERENCES accounts(uid) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_licenses_uid ON licenses(uid);
CREATE TABLE IF NOT EXISTS platform_credentials (
  uid TEXT NOT NULL,
  platform TEXT NOT NULL,
  credential_ciphertext TEXT NOT NULL,
  account_name TEXT,
  metadata_json TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (uid, platform),
  FOREIGN KEY (uid) REFERENCES accounts(uid) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS video_records (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_video_id TEXT,
  video_title TEXT NOT NULL DEFAULT '',
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  metadata_json TEXT,
  FOREIGN KEY (uid) REFERENCES accounts(uid) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_video_records_uid_created ON video_records(uid, created_at DESC);
