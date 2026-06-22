// Generated from the Supabase schema (supabase/migrations). Regenerate after schema changes:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
// (or via the Supabase MCP generate_typescript_types tool). Keep in sync with the migrations.
// NOTE: the 0004 editorial-workflow tables/columns below were authored by hand alongside the
// migration; regenerate from the live DB once 0004 is applied.

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
          deleted_at: string | null
          doc: Json
          id: string
          last_worker: string | null
          published_at: string | null
          rejected_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_version: number
          series_id: string | null
          series_order: number | null
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc: Json
          id?: string
          last_worker?: string | null
          published_at?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          series_id?: string | null
          series_order?: number | null
          slug: string
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          doc?: Json
          id?: string
          last_worker?: string | null
          published_at?: string | null
          rejected_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: number
          series_id?: string | null
          series_order?: number | null
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
          {
            foreignKeyName: "artifacts_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          artifact_id: string | null
          created_at: string
          detail: Json | null
          id: string
        }
        Insert: {
          action: string
          actor: string
          artifact_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          artifact_id?: string | null
          created_at?: string
          detail?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          action: Database["public"]["Enums"]["directive_action"] | null
          addressed_at: string | null
          addressed_by: string | null
          artifact_id: string
          author: string | null
          created_at: string
          id: string
          note: string | null
          options: Json | null
          publish_after: boolean
          status: Database["public"]["Enums"]["comment_status"]
        }
        Insert: {
          action?: Database["public"]["Enums"]["directive_action"] | null
          addressed_at?: string | null
          addressed_by?: string | null
          artifact_id: string
          author?: string | null
          created_at?: string
          id?: string
          note?: string | null
          options?: Json | null
          publish_after?: boolean
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Update: {
          action?: Database["public"]["Enums"]["directive_action"] | null
          addressed_at?: string | null
          addressed_by?: string | null
          artifact_id?: string
          author?: string | null
          created_at?: string
          id?: string
          note?: string | null
          options?: Json | null
          publish_after?: boolean
          status?: Database["public"]["Enums"]["comment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "comments_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      revisions: {
        Row: {
          artifact_id: string
          created_at: string
          created_by: string | null
          doc: Json
          id: string
          note: string | null
          schema_version: number
          summary: string | null
          title: string | null
        }
        Insert: {
          artifact_id: string
          created_at?: string
          created_by?: string | null
          doc: Json
          id?: string
          note?: string | null
          schema_version: number
          summary?: string | null
          title?: string | null
        }
        Update: {
          artifact_id?: string
          created_at?: string
          created_by?: string | null
          doc?: Json
          id?: string
          note?: string | null
          schema_version?: number
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          created_at: string
          id: string
          slug: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          summary?: string | null
          title?: string
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
      bookmarks: {
        Row: {
          artifact_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          artifact_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          artifact_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_comments: {
        Row: {
          artifact_id: string
          author_avatar: string | null
          author_id: string
          author_name: string | null
          body: string
          created_at: string
          edited: boolean
          id: string
          status: Database["public"]["Enums"]["reader_comment_status"]
          updated_at: string
        }
        Insert: {
          artifact_id: string
          author_avatar?: string | null
          author_id: string
          author_name?: string | null
          body: string
          created_at?: string
          edited?: boolean
          id?: string
          status?: Database["public"]["Enums"]["reader_comment_status"]
          updated_at?: string
        }
        Update: {
          artifact_id?: string
          author_avatar?: string | null
          author_id?: string
          author_name?: string | null
          body?: string
          created_at?: string
          edited?: boolean
          id?: string
          status?: Database["public"]["Enums"]["reader_comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_comments_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          scope: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          scope?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      artifact_status:
        | "draft"
        | "published"
        | "rejected"
        | "needs_review"
        | "changes_requested"
        | "approved"
        | "archived"
      comment_status: "open" | "addressed" | "dismissed"
      reader_comment_status: "visible" | "hidden" | "removed"
      directive_action:
        | "revise"
        | "expand"
        | "condense"
        | "reverify"
        | "split"
        | "make_series"
        | "add_to_series"
        | "archive"
      source_db: "pdb" | "chembl" | "pubmed" | "biorxiv"
      source_role: "primary" | "supporting"
      user_role: "admin" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
