import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { Conversation, Character, AppSettings } from "@/store/types";

interface CodiaDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { "by-updated": Date };
  };
  characters: {
    key: string;
    value: Character;
    indexes: { "by-name": string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  cache: {
    key: string;
    value: { data: ArrayBuffer; timestamp: number };
  };
}

const DB_NAME = "codia-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CodiaDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<CodiaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CodiaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Conversations store
        if (!db.objectStoreNames.contains("conversations")) {
          const conversationStore = db.createObjectStore("conversations", {
            keyPath: "id",
          });
          conversationStore.createIndex("by-updated", "updatedAt");
        }

        // Characters store
        if (!db.objectStoreNames.contains("characters")) {
          const characterStore = db.createObjectStore("characters", {
            keyPath: "id",
          });
          characterStore.createIndex("by-name", "name");
        }

        // Settings store
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings");
        }

        // Cache store for VRM files
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
      },
    });
  }
  return dbPromise;
}

// Conversation operations
export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put("conversations", conversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get("conversations", id);
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  return db.getAllFromIndex("conversations", "by-updated");
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("conversations", id);
}

// Character operations
export async function saveCharacter(character: Character): Promise<void> {
  const db = await getDB();
  await db.put("characters", character);
}

export async function getCharacter(id: string): Promise<Character | undefined> {
  const db = await getDB();
  return db.get("characters", id);
}

export async function getAllCharacters(): Promise<Character[]> {
  const db = await getDB();
  return db.getAll("characters");
}

export async function deleteCharacter(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("characters", id);
}

// Settings operations
export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", settings, "app-settings");
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  return db.get("settings", "app-settings");
}

// Cache operations (for VRM files)
export async function cacheFile(url: string, data: ArrayBuffer): Promise<void> {
  const db = await getDB();
  await db.put("cache", { data, timestamp: Date.now() }, url);
}

export async function getCachedFile(
  url: string,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<ArrayBuffer | null> {
  const db = await getDB();
  const cached = await db.get("cache", url);

  if (cached && Date.now() - cached.timestamp < maxAge) {
    return cached.data;
  }

  return null;
}

export async function clearCache(): Promise<void> {
  const db = await getDB();
  await db.clear("cache");
}

// Export all data for backup
export async function exportData(): Promise<{
  conversations: Conversation[];
  characters: Character[];
  settings: AppSettings | undefined;
}> {
  const [conversations, characters, settings] = await Promise.all([
    getAllConversations(),
    getAllCharacters(),
    getSettings(),
  ]);

  return { conversations, characters, settings };
}

// Import data from backup
export async function importData(data: {
  conversations?: Conversation[];
  characters?: Character[];
  settings?: AppSettings;
}): Promise<void> {
  const db = await getDB();

  if (data.conversations) {
    const tx = db.transaction("conversations", "readwrite");
    await Promise.all([
      ...data.conversations.map((c) => tx.store.put(c)),
      tx.done,
    ]);
  }

  if (data.characters) {
    const tx = db.transaction("characters", "readwrite");
    await Promise.all([
      ...data.characters.map((c) => tx.store.put(c)),
      tx.done,
    ]);
  }

  if (data.settings) {
    await saveSettings(data.settings);
  }
}
