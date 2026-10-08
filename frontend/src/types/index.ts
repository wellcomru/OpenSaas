export type UUID = string;

export type UserRole = "admin" | "user";

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface User {
  id: UUID;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  balance: string;
  created_at: string;
  profile?: UserProfile | null;
}

export interface AuthConfig {
  /** Почта настроена: регистрация с кодом из письма, работает сброс пароля. */
  email_enabled: boolean;
  captcha: "altcha" | null;
}

export interface AltchaChallenge {
  algorithm: string;
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  pending_verification?: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Payment {
  id: UUID;
  amount: string;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  provider: "robokassa" | "stripe";
  created_at: string;
}

export interface ReferralStats {
  total_referred: number;
  converted: number;
  total_earned: string;
  pending_payout: string;
}

export interface MyReferralCode {
  code: string;
  url: string;
  stats: ReferralStats;
}

export interface ReferralPayout {
  id: UUID;
  amount: string;
  status: "pending" | "approved" | "paid" | "rejected";
  paid_at: string | null;
  created_at: string;
}

export interface ApiKey {
  id: UUID;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
  full_key: string;
}

export interface AdminStats {
  total_users: number;
  revenue: string;
  ai_spent: string;
  ai_profit: string;
  total_balance: string;
  pending_payouts: string;
}

export interface ReferralUser {
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: "registered" | "trial" | "converted";
  created_at: string;
}

export interface Balance {
  balance: string;
  currency: string;
  topup_min: string;
  topup_max: string;
  topup_presets: number[];
}

export interface BalanceTransaction {
  id: UUID;
  amount: string;
  kind: "topup" | "bonus" | "admin";
  description: string;
  created_at: string;
}

/** Цены за 1 млн токенов, ₽ (для пользователя — уже с наценкой). */
export interface AiModel {
  id: string;
  name: string;
  description: string;
  input_price: string;
  output_price: string;
}

export interface AiModelAdmin extends AiModel {
  is_active: boolean;
  sort_order: number;
}

export interface ChatConfig {
  enabled: boolean;
  default_model: string;
  markup_percent: string;
  models: AiModel[];
}

export interface Chat {
  id: UUID;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: UUID;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: string;
  created_at: string;
}

export interface ChatUsage {
  balance: string;
  total_spent: string;
}
