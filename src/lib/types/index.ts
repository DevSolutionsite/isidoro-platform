import type { Database } from './database.types'

// Aliases de Row
export type Profile           = Database['public']['Tables']['profiles']['Row']
export type Category          = Database['public']['Tables']['categories']['Row']
export type Product           = Database['public']['Tables']['products']['Row']
export type Promotion         = Database['public']['Tables']['promotions']['Row']
export type TimeOffer         = Database['public']['Tables']['time_offers']['Row']
export type TimeOfferProduct  = Database['public']['Tables']['time_offer_products']['Row']
export type Reward            = Database['public']['Tables']['rewards']['Row']
export type Consumption       = Database['public']['Tables']['consumptions']['Row']
export type PointsBalance     = Database['public']['Tables']['points_balance']['Row']
export type Redemption        = Database['public']['Tables']['redemptions']['Row']
export type PointsTransaction = Database['public']['Tables']['points_transactions']['Row']
export type Settings          = Database['public']['Tables']['settings']['Row']

// Aliases de Insert
export type InsertConsumption = Database['public']['Tables']['consumptions']['Insert']
export type InsertRedemption  = Database['public']['Tables']['redemptions']['Insert']

// Tipos compuestos para UI
export type ProductWithCategory = Product & {
  category: Pick<Category, 'id' | 'name'>
}

export type ProductWithDiscount = Product & {
  discount_price: number | null
}

export type PromoSlide = {
  id: string
  badge: string
  title: string
  description: string | null
  price: number | null
  originalPrice: number | null
}

export type TimeOfferWithProducts = TimeOffer & {
  products: Product[]
}

export type RedemptionWithReward = Redemption & {
  reward: Pick<Reward, 'id' | 'name' | 'points_cost'>
}

export type ConsumptionWithClient = Consumption & {
  client: Pick<Profile, 'id' | 'full_name' | 'qr_token'>
}

// Roles
export type UserRole = Profile['role']

// Tipos de response de Edge Functions
export type RegisterConsumptionResponse = {
  consumption_id: string
  points_earned:  number
  new_balance:    number
}

export type InitiateRedemptionResponse = {
  redemption_id: string
  code:          string
  expires_at:    string
}

export type ConfirmRedemptionResponse = {
  redemption_id:      string
  client_id:          string
  reward_name:        string
  points_used:        number
  client_new_balance: number
}

export type SplitConsumptionEntry = {
  client_id:      string
  consumption_id: string
  points_earned:  number
  new_balance:    number
}

export type SplitConsumptionResponse = {
  session_id: string
  splits:     SplitConsumptionEntry[]
}

export type ReportSummary = {
  total_revenue:         number
  total_consumptions:    number
  unique_clients:        number
  total_points_credited: number
  total_points_redeemed: number
}

export type ReportConsumptionByDay = {
  date:         string
  count:        number
  total_amount: number
  points_earned: number
}

export type ReportTopClient = {
  client_id:           string
  full_name:           string
  visit_count:         number
  total_spent:         number
  total_points_earned: number
}

export type ReportTopReward = {
  reward_id:         string
  reward_name:       string
  redemption_count:  number
  total_points_used: number
}

export type ReportsResponse = {
  period: {
    from:     string
    to:       string
    timezone: string
  }
  summary:             ReportSummary
  consumptions_by_day: ReportConsumptionByDay[]
  top_clients:         ReportTopClient[]
  top_rewards:         ReportTopReward[]
}

// Error de Edge Function
export type EdgeFunctionError = {
  error:     string
  code:      string
  available?: number
  required?:  number
  sum?:       number
  expected?:  number
}
