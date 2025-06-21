import { promises as fs } from "fs";
import path from "path";

// Use a temporary file in the .next/cache directory for persistence
const CACHE_DIR = path.join(process.cwd(), ".next", "cache");
const TRAVERSAL_CACHE_FILE = path.join(CACHE_DIR, "latest-traversal.json");

// Ensure cache directory exists
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Shared state for traversal results
let latestTraversalResult: any = null;

export async function setLatestTraversalResult(result: any) {
  try {
    await ensureCacheDir();
    await fs.writeFile(TRAVERSAL_CACHE_FILE, JSON.stringify(result), 'utf-8');
    console.log(`💾 [Traversal State] Stored traversal result with ${result?.traversalDecisions?.length || 0} decisions to cache file`);
  } catch (error) {
    console.error(`❌ [Traversal State] Failed to store result:`, error);
    // Fallback to memory storage
    latestTraversalResult = result;
    console.log(`💾 [Traversal State] Fallback: Stored traversal result with ${result?.traversalDecisions?.length || 0} decisions in memory`);
  }
}

export async function getLatestTraversalResult() {
  try {
    const data = await fs.readFile(TRAVERSAL_CACHE_FILE, 'utf-8');
    const result = JSON.parse(data);
    console.log(`📤 [Traversal State] Retrieved traversal result from cache file: available`);
    return result;
  } catch (error) {
    console.log(`📤 [Traversal State] No cache file found, checking memory: ${latestTraversalResult ? 'available' : 'not available'}`);
    return latestTraversalResult;
  }
}

export async function clearLatestTraversalResult() {
  try {
    await fs.unlink(TRAVERSAL_CACHE_FILE);
    console.log(`🧹 [Traversal State] Cleared traversal result cache file`);
  } catch (error) {
    // File might not exist, ignore error
  }
  latestTraversalResult = null;
  console.log(`🧹 [Traversal State] Cleared traversal result from memory`);
} 