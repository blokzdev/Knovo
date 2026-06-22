// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
// (or via the Supabase MCP generate_typescript_types tool). Keep in sync with the migrations.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artifact_sources: {
        Row: {
          artifact_id: string
          citation_text: string | null
          role: Database["public"]["Enums"]["source_role"]
          source_id: string
        }
        Insert: {
          artifact_id: string
          citation_text?: string | null
          role?: Database["public"]["Enums"]["source_role"]
          source_id: string
        }
        Update: {
          artifact_id?: string
          citation_text?: string | null
          role?: Database["public"]["Enums"]["source_role"]
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_sources_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artifact_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          created_at: string
          created_by: string | null
          doc: Json
          id: string
          published_at: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_version: number
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc: Json
          id?: string
          published_at?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          slug: string
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc?: Json
          id?: string
          published_at?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          slug?: string
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          raw_meta: Json | null
          retrieved_at: string
          source_db: Database["public"]["Enums"]["source_db"]
          source_uid: string
          title: string | null
          url: string | null
        }
        Insert: {
          id?: string
          raw_meta?: Json | null
          retrieved_at?: string
          source_db: Database["public"]["Enums"]["source_db"]
          source_uid: string
          title?: string | null
          url?: string | null
        }
        Update: {
          id?: string
          raw_meta?: Json | null
          retrieved_at?: string
          source_db?: Database["public"]["Enums"]["source_db"]
          source_uid?: string
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      rejected_source_keys: {
        Row: {
          source_db: Database["public"]["Enums"]["source_db"] | null
          source_uid: string | null
        }
        Relationships: []
      }
      seen_source_keys: {
        Row: {
          source_db: Database["public"]["Enums"]["source_db"] | null
          source_uid: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      artifact_status: "draft" | "published" | "rejected"
      source_db: "pdb" | "chembl" | "pubmed" | "biorxiv"
      source_role: "primary" | "supporting"
      user_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
