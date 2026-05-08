/* eslint-disable */
const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");

const dbPath = path.resolve(__dirname, "dev.db");
const db = new DatabaseSync(dbPath);

const migrations = [
  `CREATE TABLE IF NOT EXISTS Volume (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    title TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    summary TEXT NOT NULL DEFAULT '',
    wordTarget INTEGER,
    wordCount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_volume_project ON Volume(projectId)",
  `CREATE TABLE IF NOT EXISTS StoryArc (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    arcType TEXT NOT NULL DEFAULT 'plot',
    status TEXT NOT NULL DEFAULT 'open',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_storyarc_project ON StoryArc(projectId)",
  `CREATE TABLE IF NOT EXISTS PlotThread (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'open',
    openedChapter INTEGER,
    resolvedChapter INTEGER,
    note TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_plotthread_project ON PlotThread(projectId)",
  `CREATE TABLE IF NOT EXISTS CharacterState (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    characterId TEXT NOT NULL,
    chapterNum INTEGER NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    goal TEXT NOT NULL DEFAULT '',
    emotion TEXT NOT NULL DEFAULT '',
    relationships TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_characterstate_project ON CharacterState(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_characterstate_char ON CharacterState(characterId)",
  "CREATE INDEX IF NOT EXISTS idx_characterstate_chapter ON CharacterState(chapterNum)",
  `CREATE TABLE IF NOT EXISTS TimelineEvent (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    chapterNum INTEGER NOT NULL,
    eventDesc TEXT NOT NULL,
    storyTime TEXT NOT NULL DEFAULT '',
    characters TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_timelineevent_project ON TimelineEvent(projectId)",
  "CREATE INDEX IF NOT EXISTS idx_timelineevent_chapter ON TimelineEvent(chapterNum)",
  `CREATE TABLE IF NOT EXISTS ChekhovGun (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    projectId TEXT NOT NULL,
    description TEXT NOT NULL,
    plantedChapter INTEGER NOT NULL,
    payedChapter INTEGER,
    status TEXT NOT NULL DEFAULT 'planted',
    FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
  )`,
  "CREATE INDEX IF NOT EXISTS idx_chekhovgun_project ON ChekhovGun(projectId)",
  `CREATE TABLE IF NOT EXISTS ChapterOutline (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    chapterId TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL DEFAULT '',
    keyEvents TEXT NOT NULL DEFAULT '[]',
    characterArcs TEXT NOT NULL DEFAULT '[]',
    plotThreads TEXT NOT NULL DEFAULT '[]',
    wordTarget INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE
  )`,
];

for (const sql of migrations) {
  try {
    db.exec(sql);
    console.log("  OK:", sql.slice(0, 60).replace(/\n/g, " "));
  } catch (e) {
    console.log("  SKIP:", e.message.slice(0, 80));
  }
}

console.log("\n✓ v0.5 migration complete");
console.log("  Location:", dbPath);
db.close();
