import { openDB, type IDBPDatabase, type DBSchema } from "idb";
import type { Conversation, Character, AppSettings } from "@/store/types";
import type { UserProfile, MemoryEntry } from "./memory/types";

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
  // Memory system stores
  userProfiles: {
    key: string;
    value: UserProfile;
    indexes: { "by-updated": Date };
  };
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: {
      "by-user": string;
      "by-type": string;
      "by-created": Date;
      "by-accessed": Date;
    };
  };
}

const DB_NAME = "codia-db";
const DB_VERSION = 2; // Updated for memory system

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

        // User profiles store (memory system)
        if (!db.objectStoreNames.contains("userProfiles")) {
          const profileStore = db.createObjectStore("userProfiles", {
            keyPath: "id",
          });
          profileStore.createIndex("by-updated", "updatedAt");
        }

        // Memories store (memory system)
        if (!db.objectStoreNames.contains("memories")) {
          const memoryStore = db.createObjectStore("memories", {
            keyPath: "id",
          });
          memoryStore.createIndex("by-user", "userId");
          memoryStore.createIndex("by-type", "type");
          memoryStore.createIndex("by-created", "createdAt");
          memoryStore.createIndex("by-accessed", "lastAccessed");
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

// ================== User Profile Operations ==================

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put("userProfiles", profile);
}

export async function getUserProfile(id: string): Promise<UserProfile | undefined> {
  const db = await getDB();
  return db.get("userProfiles", id);
}

export async function getDefaultUserProfile(): Promise<UserProfile | undefined> {
  const db = await getDB();
  return db.get("userProfiles", "default");
}

export async function deleteUserProfile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("userProfiles", id);
}

// ================== Memory Operations ==================

export async function saveMemory(memory: MemoryEntry): Promise<void> {
  const db = await getDB();
  await db.put("memories", memory);
}

export async function saveMemories(memories: MemoryEntry[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("memories", "readwrite");
  await Promise.all([
    ...memories.map((m) => tx.store.put(m)),
    tx.done,
  ]);
}

export async function getMemory(id: string): Promise<MemoryEntry | undefined> {
  const db = await getDB();
  return db.get("memories", id);
}

export async function getMemoriesByUser(userId: string): Promise<MemoryEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("memories", "by-user", userId);
}

export async function getMemoriesByType(
  userId: string,
  type: MemoryEntry["type"]
): Promise<MemoryEntry[]> {
  const db = await getDB();
  const allByType = await db.getAllFromIndex("memories", "by-type", type);
  return allByType.filter((m) => m.userId === userId);
}

export async function getRecentMemories(
  userId: string,
  limit: number = 10
): Promise<MemoryEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("memories", "by-accessed");
  return all
    .filter((m) => m.userId === userId)
    .reverse()
    .slice(0, limit);
}

export async function updateMemoryAccess(id: string): Promise<void> {
  const db = await getDB();
  const memory = await db.get("memories", id);
  if (memory) {
    memory.lastAccessed = new Date();
    memory.accessCount += 1;
    await db.put("memories", memory);
  }
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("memories", id);
}

export async function deleteMemoriesByUser(userId: string): Promise<void> {
  const db = await getDB();
  const memories = await getMemoriesByUser(userId);
  const tx = db.transaction("memories", "readwrite");
  await Promise.all([
    ...memories.map((m) => tx.store.delete(m.id)),
    tx.done,
  ]);
}

export async function searchMemories(
  userId: string,
  query: string,
  options: {
    types?: MemoryEntry["type"][];
    minConfidence?: number;
    limit?: number;
  } = {}
): Promise<MemoryEntry[]> {
  const db = await getDB();
  let memories = await getMemoriesByUser(userId);

  // Filter by types
  if (options.types?.length) {
    memories = memories.filter((m) => options.types!.includes(m.type));
  }

  // Filter by confidence
  if (options.minConfidence !== undefined) {
    memories = memories.filter((m) => m.confidence >= options.minConfidence!);
  }

  // Simple text search in content, summary, and tags
  const lowerQuery = query.toLowerCase();
  memories = memories.filter(
    (m) =>
      m.content.toLowerCase().includes(lowerQuery) ||
      m.summary.toLowerCase().includes(lowerQuery) ||
      m.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );

  // Sort by relevance (access count and recency)
  memories.sort((a, b) => {
    const scoreA = a.accessCount + (Date.now() - a.lastAccessed.getTime()) / 86400000;
    const scoreB = b.accessCount + (Date.now() - b.lastAccessed.getTime()) / 86400000;
    return scoreB - scoreA;
  });

  // Apply limit
  if (options.limit) {
    memories = memories.slice(0, options.limit);
  }

  return memories;
}
