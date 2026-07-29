export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string
          points_per_peso: number
          timezone: string
          updated_at: string
        }
        Insert: {
          id?: string
          points_per_peso?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          points_per_peso?: number
          timezone?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          role: 'cliente' | 'cajero' | 'admin'
          full_name: string
          dni: string | null
          phone: string | null
          city: string | null
          qr_token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'cliente' | 'cajero' | 'admin'
          full_name: string
          dni?: string | null
          phone?: string | null
          city?: string | null
          qr_token?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: 'cliente' | 'cajero' | 'admin'
          full_name?: string
          dni?: string | null
          phone?: string | null
          city?: string | null
          qr_token?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          sort_order: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          sort_order?: number
          deleted_at?: string | null
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          sort_order: number
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          sort_order?: number
          deleted_at?: string | null
          updated_at?: string
        }
      }
      promotions: {
        Row: {
          id: string
          name: string
          description: string | null
          valid_from: string
          valid_until: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          valid_from: string
          valid_until: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          valid_from?: string
          valid_until?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      time_offers: {
        Row: {
          id: string
          name: string
          description: string | null
          start_time: string
          end_time: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          start_time: string
          end_time: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          start_time?: string
          end_time?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      time_offer_products: {
        Row: {
          id: string
          time_offer_id: string
          product_id: string
          price_override: number | null
        }
        Insert: {
          id?: string
          time_offer_id: string
          product_id: string
          price_override?: number | null
        }
        Update: {
          time_offer_id?: string
          product_id?: string
          price_override?: number | null
        }
      }
      rewards: {
        Row: {
          id: string
          name: string
          description: string | null
          points_cost: number
          stock: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          points_cost: number
          stock?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          points_cost?: number
          stock?: number | null
          is_active?: boolean
          updated_at?: string
        }
      }
      consumptions: {
        Row: {
          id: string
          client_id: string
          cashier_id: string
          amount: number
          points_earned: number
          notes: string | null
          session_id: string | null
          consumed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          cashier_id: string
          amount: number
          points_earned?: number
          notes?: string | null
          session_id?: string | null
          consumed_at?: string
          created_at?: string
        }
        Update: {
          notes?: string | null
          points_earned?: number
        }
      }
      points_balance: {
        Row: {
          id: string
          client_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          total_points?: number
          updated_at?: string
        }
      }
      redemptions: {
        Row: {
          id: string
          client_id: string
          reward_id: string
          cashier_id: string | null
          code: string
          status: 'pending' | 'confirmed' | 'expired'
          points_used: number
          initiated_at: string
          confirmed_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          reward_id: string
          cashier_id?: string | null
          code: string
          status?: 'pending' | 'confirmed' | 'expired'
          points_used: number
          initiated_at?: string
          confirmed_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Update: {
          cashier_id?: string | null
          status?: 'pending' | 'confirmed' | 'expired'
          confirmed_at?: string | null
        }
      }
      points_transactions: {
        Row: {
          id: string
          client_id: string
          type: 'consumption' | 'redemption' | 'manual_adjustment' | 'expiry'
          consumption_id: string | null
          redemption_id: string | null
          adjusted_by: string | null
          points: number
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          type: 'consumption' | 'redemption' | 'manual_adjustment' | 'expiry'
          consumption_id?: string | null
          redemption_id?: string | null
          adjusted_by?: string | null
          points: number
          expires_at?: string | null
          created_at?: string
        }
        Update: never
      }
    }
  }
}
