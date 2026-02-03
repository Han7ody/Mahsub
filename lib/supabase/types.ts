/**
 * Database Types
 * 
 * These types will be generated from your Supabase schema using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 * 
 * For now, using placeholder. After running migrations, regenerate this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          name: string
          owner_user_id: string
          phone: string | null
          address: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_user_id: string
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_user_id?: string
          phone?: string | null
          address?: string | null
          logo_url?: string | null
          created_at?: string
        }
      }
      business_members: {
        Row: {
          business_id: string
          user_id: string
          role: 'owner' | 'manager' | 'staff'
          permissions: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          business_id: string
          user_id: string
          role: 'owner' | 'manager' | 'staff'
          permissions?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          business_id?: string
          user_id?: string
          role?: 'owner' | 'manager' | 'staff'
          permissions?: Json
          is_active?: boolean
          created_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          business_id: string
          name: string
          phone: string | null
          avatar_url: string | null
          opening_balance: number
          opening_balance_direction: 'in' | 'out' | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          phone?: string | null
          avatar_url?: string | null
          opening_balance?: number
          opening_balance_direction?: 'in' | 'out' | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          phone?: string | null
          avatar_url?: string | null
          opening_balance?: number
          opening_balance_direction?: 'in' | 'out' | null
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          business_id: string
          name: string
          phone: string | null
          avatar_url: string | null
          opening_balance: number
          opening_balance_direction: 'in' | 'out' | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          phone?: string | null
          avatar_url?: string | null
          opening_balance?: number
          opening_balance_direction?: 'in' | 'out' | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          phone?: string | null
          avatar_url?: string | null
          opening_balance?: number
          opening_balance_direction?: 'in' | 'out' | null
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          business_id: string
          entity_type: 'customer' | 'supplier' | 'ledger'
          customer_id: string | null
          supplier_id: string | null
          type: 'in' | 'out'
          amount: number
          payment_method: 'cash' | 'online' | 'bank' | 'other'
          title: string | null
          notes: string | null
          occurred_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          entity_type: 'customer' | 'supplier' | 'ledger'
          customer_id?: string | null
          supplier_id?: string | null
          type: 'in' | 'out'
          amount: number
          payment_method?: 'cash' | 'online' | 'bank' | 'other'
          title?: string | null
          notes?: string | null
          occurred_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          entity_type?: 'customer' | 'supplier' | 'ledger'
          customer_id?: string | null
          supplier_id?: string | null
          type?: 'in' | 'out'
          amount?: number
          payment_method?: 'cash' | 'online' | 'bank' | 'other'
          title?: string | null
          notes?: string | null
          occurred_at?: string
          created_by?: string | null
          created_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          business_id: string
          transaction_id: string
          bucket: string
          path: string
          file_name: string | null
          mime_type: string | null
          size_bytes: number | null
          created_at: string
        }
        Insert: {
          id?: string
          business_id: string
          transaction_id: string
          bucket?: string
          path: string
          file_name?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          transaction_id?: string
          bucket?: string
          path?: string
          file_name?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          created_at?: string
        }
      }
      workers: {
        Row: {
          id: string
          business_id: string
          name: string
          role: 'مدير' | 'موظف' | 'محاسب' | 'أخرى'
          phone: string
          avatar_url: string | null
          avatar_color: string
          permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          name: string
          role: 'مدير' | 'موظف' | 'محاسب' | 'أخرى'
          phone: string
          avatar_url?: string | null
          avatar_color?: string
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          name?: string
          role?: 'مدير' | 'موظف' | 'محاسب' | 'أخرى'
          phone?: string
          avatar_url?: string | null
          avatar_color?: string
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_business_member: {
        Args: { bid: string }
        Returns: boolean
      }
      is_owner_or_manager: {
        Args: { bid: string }
        Returns: boolean
      }
      has_permission: {
        Args: { bid: string; perm: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
