import { createClient } from '@supabase/supabase-js';
import * as SQLite from 'expo-sqlite';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize SQLite database
const db = SQLite.openDatabaseSync('skillsfile.db');

interface SyncResult {
  success: boolean;
  error?: string;
  syncedCount?: number;
}

interface SQLiteRecord {
  id: string;
  synced: number;
  [key: string]: any;
}

export const syncToSupabase = async (): Promise<SyncResult> => {
  try {
    // Get all unsynced records from SQLite
    const selectStmt = await db.prepareAsync('SELECT * FROM records WHERE synced = 0');
    const selectResult = await selectStmt.executeAsync<SQLiteRecord>();
    const result = await selectResult.getAllAsync();
    
    if (!Array.isArray(result) || result.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Transform records to match Supabase schema
    const transformedRecords = result.map(record => {
      const { synced, ...rest } = record;
      // Remove _uuid suffix from column names
      const transformedRecord = Object.entries(rest).reduce((acc, [key, value]) => {
        const newKey = key.replace('_uuid', '');
        acc[newKey] = value;
        return acc;
      }, {} as Record<string, any>);
      return transformedRecord;
    });

    // Insert records into Supabase
    const { data, error } = await supabase
      .from('records')
      .upsert(transformedRecords, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (error) {
      throw error;
    }

    // Update synced status in SQLite
    const updateStmt = await db.prepareAsync('UPDATE records SET synced = 1 WHERE synced = 0');
    await updateStmt.executeAsync();

    return {
      success: true,
      syncedCount: transformedRecords.length
    };

  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error'
    };
  }
};

// Function to test the connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}; 