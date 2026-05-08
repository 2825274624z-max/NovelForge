/* eslint-disable */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const dbPath = path.resolve(__dirname, "dev.db");

// Remove existing database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("Removed existing database");
}

const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS Project (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'novel',
  genre TEXT NOT NULL DEFAULT '',
  style TEXT NOT NULL DEFAULT '',
  targetWords INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  worldView TEXT NOT NULL DEFAULT '',
  writingReqs TEXT NOT NULL DEFAULT '',
  coverPrompt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS Chapter (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  "order" INTEGER NOT NULL DEFAULT 0,
  wordCount INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ChapterHistory (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  chapterId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  wordCount INTEGER NOT NULL,
  version INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Character (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  identity TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  relationships TEXT NOT NULL DEFAULT '',
  quirks TEXT NOT NULL DEFAULT '',
  appearance TEXT NOT NULL DEFAULT '',
  backstory TEXT NOT NULL DEFAULT '',
  characterArc TEXT NOT NULL DEFAULT '',
  avatarPrompt TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS WorldBuilding (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'general',
  rules TEXT NOT NULL DEFAULT '',
  history TEXT NOT NULL DEFAULT '',
  factions TEXT NOT NULL DEFAULT '',
  limitations TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Location (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  faction TEXT NOT NULL DEFAULT '',
  importantEvents TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Organization (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  members TEXT NOT NULL DEFAULT '',
  resources TEXT NOT NULL DEFAULT '',
  rivalries TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Item (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  effect TEXT NOT NULL DEFAULT '',
  limitations TEXT NOT NULL DEFAULT '',
  sideEffects TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Foreshadowing (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  chapterHint TEXT NOT NULL DEFAULT '',
  plantChapterId TEXT NOT NULL DEFAULT '',
  resolveChapterId TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planted',
  resolved INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Timeline (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  timePos INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  relatedCharacters TEXT NOT NULL DEFAULT '',
  relatedChapters TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AISettings (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o',
  baseUrl TEXT NOT NULL DEFAULT '',
  apiKey TEXT NOT NULL DEFAULT '',
  temperature REAL NOT NULL DEFAULT 0.7,
  maxTokens INTEGER NOT NULL DEFAULT 4096,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chapter_project ON Chapter(projectId);
CREATE INDEX IF NOT EXISTS idx_chapterhistory_chapter ON ChapterHistory(chapterId);
CREATE INDEX IF NOT EXISTS idx_character_project ON Character(projectId);
CREATE INDEX IF NOT EXISTS idx_worldbuilding_project ON WorldBuilding(projectId);
CREATE INDEX IF NOT EXISTS idx_location_project ON Location(projectId);
CREATE INDEX IF NOT EXISTS idx_organization_project ON Organization(projectId);
CREATE INDEX IF NOT EXISTS idx_item_project ON Item(projectId);
CREATE INDEX IF NOT EXISTS idx_foreshadowing_project ON Foreshadowing(projectId);
CREATE INDEX IF NOT EXISTS idx_timeline_project ON Timeline(projectId);
CREATE INDEX IF NOT EXISTS idx_aisettings_project ON AISettings(projectId);

CREATE TABLE IF NOT EXISTS DailyWritingLog (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  date TEXT NOT NULL,
  wordCount INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE,
  UNIQUE(projectId, date)
);

CREATE INDEX IF NOT EXISTS idx_dailywritinglog_project ON DailyWritingLog(projectId);
CREATE INDEX IF NOT EXISTS idx_dailywritinglog_project_date ON DailyWritingLog(projectId, date);

CREATE TABLE IF NOT EXISTS AIGeneration (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  projectId TEXT NOT NULL,
  chapterId TEXT,
  workflow TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  prompt TEXT NOT NULL DEFAULT '',
  systemPrompt TEXT NOT NULL DEFAULT '',
  output TEXT NOT NULL DEFAULT '',
  temperature REAL NOT NULL DEFAULT 0.7,
  maxTokens INTEGER NOT NULL DEFAULT 4096,
  FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aigeneration_project ON AIGeneration(projectId);
CREATE INDEX IF NOT EXISTS idx_aigeneration_chapter ON AIGeneration(chapterId);
`);

console.log("✓ Database initialized successfully!");

// Migrate existing databases: add new columns (safe to run — ignore if already exist)
const migrations = [
  "ALTER TABLE Character ADD COLUMN characterArc TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE WorldBuilding ADD COLUMN rules TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE WorldBuilding ADD COLUMN history TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE WorldBuilding ADD COLUMN factions TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE WorldBuilding ADD COLUMN limitations TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Location ADD COLUMN faction TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Location ADD COLUMN importantEvents TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Organization ADD COLUMN goals TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Organization ADD COLUMN members TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Organization ADD COLUMN resources TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Organization ADD COLUMN rivalries TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Item ADD COLUMN effect TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Item ADD COLUMN limitations TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Item ADD COLUMN sideEffects TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Item ADD COLUMN source TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Foreshadowing ADD COLUMN plantChapterId TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Foreshadowing ADD COLUMN resolveChapterId TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Foreshadowing ADD COLUMN status TEXT NOT NULL DEFAULT 'planted'",
  "ALTER TABLE Timeline ADD COLUMN relatedCharacters TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE Timeline ADD COLUMN relatedChapters TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN workflow TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN model TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN provider TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN prompt TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN systemPrompt TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN output TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE AIGeneration ADD COLUMN temperature REAL NOT NULL DEFAULT 0.7",
  "ALTER TABLE AIGeneration ADD COLUMN maxTokens INTEGER NOT NULL DEFAULT 4096",
  // DailyWritingLog migration — create table if not exists
  `CREATE TABLE IF NOT EXISTS DailyWritingLog (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    date TEXT NOT NULL,
    wordCount INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE,
    UNIQUE(projectId, date)
  )`,
  "CREATE INDEX IF NOT EXISTS idx_dailywritinglog_project ON DailyWritingLog(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_dailywritinglog_project_date ON DailyWritingLog(projectId, date)",
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* column already exists */ }
}

console.log("  Location:", dbPath);
db.close();
