export interface Issue {
  id: string;
  user_id?: string;
  firebase_uid: string;
  title: string;
  description: string;
  category: 'pothole' | 'garbage' | 'streetlight' | 'water' | 'other' | string;
  severity: 'low' | 'medium' | 'high';
  status: 'reported' | 'investigating' | 'in_progress' | 'resolved' | 'duplicate';
  latitude: number;
  longitude: number;
  address: string;
  landmark?: string;
  photo_url: string;
  resolved_photo_url?: string;
  resolution_photo_url?: string;
  resolved_by?: string;
  resolution_verified?: boolean;
  resolution_ai_analysis?: string;
  resolved_at?: string;
  ai_confidence?: number;
  ai_analysis?: string;
  ai_verdict?: string;
  upvotes: number;
  assigned_department?: string;
  priority?: 'low' | 'medium' | 'high';
  sla_deadline?: string;
  internal_notes?: string;
  is_duplicate?: boolean;
  duplicate_of?: string;
  assigned_to?: string; // assigned ward officer/staff name or ID
  resolution_cost?: number; // administrative cost
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id?: string;
  firebase_uid: string;
  phone?: string;
  display_name: string;
  points: number;
  level: number;
  badges: string[]; // Badges JSON
  streak_days?: number;
  last_active_date?: string;
  role?: 'citizen' | 'ward_officer' | 'department_head' | 'super_admin' | 'admin';
  department?: string;
  zone_assigned?: string;
  language?: 'en' | 'hi' | 'ta' | 'te' | 'bn';
  onboarded?: boolean;
  created_at: string;
}

export interface Upvote {
  id: string;
  issue_id: string;
  firebase_uid: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  issue_id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by: string;
  performed_at: string;
}

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn';
