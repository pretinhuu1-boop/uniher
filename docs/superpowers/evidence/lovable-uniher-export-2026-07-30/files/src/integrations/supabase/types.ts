export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points_reward: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          points_reward?: number
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points_reward?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      champions: {
        Row: {
          champion_type: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          title: string
          total_points: number
          user_id: string
        }
        Insert: {
          champion_type: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          title: string
          total_points?: number
          user_id: string
        }
        Update: {
          champion_type?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          title?: string
          total_points?: number
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string
          contact_name: string | null
          created_at: string
          employee_count: number | null
          hr_email: string | null
          hr_phone: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          name: string
          plan_start_date: string | null
          plan_type: string | null
          state: string | null
          trading_name: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj: string
          contact_name?: string | null
          created_at?: string
          employee_count?: number | null
          hr_email?: string | null
          hr_phone?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name: string
          plan_start_date?: string | null
          plan_type?: string | null
          state?: string | null
          trading_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string
          contact_name?: string | null
          created_at?: string
          employee_count?: number | null
          hr_email?: string | null
          hr_phone?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          name?: string
          plan_start_date?: string | null
          plan_type?: string | null
          state?: string | null
          trading_name?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          id: string
          is_active: boolean
          joined_at: string
          manager_id: string | null
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          id?: string
          is_active?: boolean
          joined_at?: string
          manager_id?: string | null
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "company_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_department_missions: {
        Row: {
          bonus_reward: string | null
          company_id: string | null
          created_at: string
          current_value: number | null
          description: string | null
          end_date: string
          icon: string | null
          id: string
          mission_type: string
          points_reward: number | null
          start_date: string
          status: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          bonus_reward?: string | null
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          end_date: string
          icon?: string | null
          id?: string
          mission_type?: string
          points_reward?: number | null
          start_date?: string
          status?: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          bonus_reward?: string | null
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          end_date?: string
          icon?: string | null
          id?: string
          mission_type?: string
          points_reward?: number | null
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_department_missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_competition_history: {
        Row: {
          badges_earned: number | null
          challenges_completed: number | null
          company_id: string | null
          created_at: string
          department: string
          employees_count: number | null
          id: string
          month: number
          rank_position: number | null
          total_points: number | null
          year: number
        }
        Insert: {
          badges_earned?: number | null
          challenges_completed?: number | null
          company_id?: string | null
          created_at?: string
          department: string
          employees_count?: number | null
          id?: string
          month: number
          rank_position?: number | null
          total_points?: number | null
          year: number
        }
        Update: {
          badges_earned?: number | null
          challenges_completed?: number | null
          company_id?: string | null
          created_at?: string
          department?: string
          employees_count?: number | null
          id?: string
          month?: number
          rank_position?: number | null
          total_points?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "department_competition_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      department_goals: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          current_value: number | null
          department: string
          description: string | null
          end_date: string
          goal_type: string
          id: string
          start_date: string
          status: string
          target_value: number
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          current_value?: number | null
          department: string
          description?: string | null
          end_date: string
          goal_type?: string
          id?: string
          start_date: string
          status?: string
          target_value: number
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          current_value?: number | null
          department?: string
          description?: string | null
          end_date?: string
          goal_type?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_notifications: {
        Row: {
          company_id: string | null
          created_at: string
          data: Json | null
          department: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          title: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          data?: Json | null
          department: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          title: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          data?: Json | null
          department?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      email_tracking: {
        Row: {
          click_count: number | null
          clicked_at: string | null
          company_id: string | null
          created_at: string
          email_type: string
          id: string
          metadata: Json | null
          open_count: number | null
          opened_at: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_at: string
          subject: string
        }
        Insert: {
          click_count?: number | null
          clicked_at?: string | null
          company_id?: string | null
          created_at?: string
          email_type: string
          id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_at?: string
          subject: string
        }
        Update: {
          click_count?: number | null
          clicked_at?: string | null
          company_id?: string | null
          created_at?: string
          email_type?: string
          id?: string
          metadata?: Json | null
          open_count?: number | null
          opened_at?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_at?: string
          subject?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          status?: string
          token?: string
        }
        Relationships: []
      }
      league_notifications: {
        Row: {
          badge_earned: string | null
          bonus_points: number | null
          created_at: string | null
          id: string
          is_read: boolean | null
          league_from: string | null
          league_to: string | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Insert: {
          badge_earned?: string | null
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          league_from?: string | null
          league_to?: string | null
          message: string
          notification_type: string
          title: string
          user_id: string
        }
        Update: {
          badge_earned?: string | null
          bonus_points?: number | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          league_from?: string | null
          league_to?: string | null
          message?: string
          notification_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      league_rewards: {
        Row: {
          badge_description: string | null
          badge_icon: string
          badge_name: string
          bonus_points: number
          created_at: string | null
          id: string
          league_id: string | null
          position: number
        }
        Insert: {
          badge_description?: string | null
          badge_icon?: string
          badge_name: string
          bonus_points?: number
          created_at?: string | null
          id?: string
          league_id?: string | null
          position: number
        }
        Update: {
          badge_description?: string | null
          badge_icon?: string
          badge_name?: string
          bonus_points?: number
          created_at?: string | null
          id?: string
          league_id?: string | null
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_rewards_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "monthly_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_streaks: {
        Row: {
          best_streak: number
          bonus_multiplier: number | null
          created_at: string | null
          current_streak: number
          id: string
          last_month: number | null
          last_year: number | null
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_streak?: number
          bonus_multiplier?: number | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_month?: number | null
          last_year?: number | null
          streak_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_streak?: number
          bonus_multiplier?: number | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_month?: number | null
          last_year?: number | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mission_department_participants: {
        Row: {
          contribution_value: number | null
          created_at: string
          department: string
          id: string
          mission_id: string
          updated_at: string
        }
        Insert: {
          contribution_value?: number | null
          created_at?: string
          department: string
          id?: string
          mission_id: string
          updated_at?: string
        }
        Update: {
          contribution_value?: number | null
          created_at?: string
          department?: string
          id?: string
          mission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_department_participants_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "cross_department_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_leagues: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          max_points: number | null
          min_points: number
          month: number
          name: string
          tier: string
          year: number
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_points?: number | null
          min_points?: number
          month: number
          name: string
          tier?: string
          year: number
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          max_points?: number | null
          min_points?: number
          month?: number
          name?: string
          tier?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json | null
          age: number | null
          avatar_url: string | null
          badges: Json | null
          birth_date: string | null
          blood_type: string | null
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          height: number | null
          id: string
          last_activity_at: string | null
          level: number | null
          location: string | null
          phone: string | null
          points: number | null
          preferences: Json | null
          referral_code: string | null
          referred_by: string | null
          risk_factors: Json | null
          streak: number | null
          stress_level: number | null
          total_campaigns_completed: number | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          achievements?: Json | null
          age?: number | null
          avatar_url?: string | null
          badges?: Json | null
          birth_date?: string | null
          blood_type?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          height?: number | null
          id?: string
          last_activity_at?: string | null
          level?: number | null
          location?: string | null
          phone?: string | null
          points?: number | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          risk_factors?: Json | null
          streak?: number | null
          stress_level?: number | null
          total_campaigns_completed?: number | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          achievements?: Json | null
          age?: number | null
          avatar_url?: string | null
          badges?: Json | null
          birth_date?: string | null
          blood_type?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          height?: number | null
          id?: string
          last_activity_at?: string | null
          level?: number | null
          location?: string | null
          phone?: string | null
          points?: number | null
          preferences?: Json | null
          referral_code?: string | null
          referred_by?: string | null
          risk_factors?: Json | null
          streak?: number | null
          stress_level?: number | null
          total_campaigns_completed?: number | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      queen_votes: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          vote_year: number
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          vote_year?: number
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          vote_year?: number
          voter_id?: string
        }
        Relationships: []
      }
      ranking_history: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          points: number
          rank: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          points?: number
          rank: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          points?: number
          rank?: number
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          points_awarded: number | null
          referral_code: string
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          registered_at: string | null
          rewarded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_code?: string
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          registered_at?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number | null
          referral_code?: string
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          registered_at?: string | null
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          notes: string | null
          points_spent: number
          processed_at: string | null
          redeemed_at: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          points_spent: number
          processed_at?: string | null
          redeemed_at?: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          points_spent?: number
          processed_at?: string | null
          redeemed_at?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          points_cost: number
          stock: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          points_cost: number
          stock?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number
          stock?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      streak_rewards: {
        Row: {
          badge_icon: string | null
          badge_name: string | null
          bonus_points: number
          created_at: string | null
          description: string | null
          id: string
          min_streak: number
          streak_type: string
        }
        Insert: {
          badge_icon?: string | null
          badge_name?: string | null
          bonus_points: number
          created_at?: string | null
          description?: string | null
          id?: string
          min_streak: number
          streak_type: string
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string | null
          bonus_points?: number
          created_at?: string | null
          description?: string | null
          id?: string
          min_streak?: number
          streak_type?: string
        }
        Relationships: []
      }
      team_mission_contributions: {
        Row: {
          contributed_at: string | null
          contribution_value: number
          id: string
          mission_id: string
          note: string | null
          user_id: string
        }
        Insert: {
          contributed_at?: string | null
          contribution_value?: number
          id?: string
          mission_id: string
          note?: string | null
          user_id: string
        }
        Update: {
          contributed_at?: string | null
          contribution_value?: number
          id?: string
          mission_id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_mission_contributions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "team_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_missions: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_value: number | null
          department: string | null
          description: string | null
          end_date: string
          icon: string | null
          id: string
          mission_type: string
          points_reward: number | null
          start_date: string
          status: string | null
          target_value: number
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_value?: number | null
          department?: string | null
          description?: string | null
          end_date: string
          icon?: string | null
          id?: string
          mission_type?: string
          points_reward?: number | null
          start_date: string
          status?: string | null
          target_value: number
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_value?: number | null
          department?: string | null
          description?: string | null
          end_date?: string
          icon?: string | null
          id?: string
          mission_type?: string
          points_reward?: number | null
          start_date?: string
          status?: string | null
          target_value?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_missions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          notified: boolean
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          notified?: boolean
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          notified?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          id: string
          points_claimed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          points_claimed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          id?: string
          points_claimed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_league_history: {
        Row: {
          bonus_points_received: number | null
          created_at: string | null
          final_points: number | null
          final_rank: number | null
          id: string
          league_tier: string
          month: number
          reward_received: string | null
          user_id: string
          was_demoted: boolean | null
          was_promoted: boolean | null
          year: number
        }
        Insert: {
          bonus_points_received?: number | null
          created_at?: string | null
          final_points?: number | null
          final_rank?: number | null
          id?: string
          league_tier: string
          month: number
          reward_received?: string | null
          user_id: string
          was_demoted?: boolean | null
          was_promoted?: boolean | null
          year: number
        }
        Update: {
          bonus_points_received?: number | null
          created_at?: string | null
          final_points?: number | null
          final_rank?: number | null
          id?: string
          league_tier?: string
          month?: number
          reward_received?: string | null
          user_id?: string
          was_demoted?: boolean | null
          was_promoted?: boolean | null
          year?: number
        }
        Relationships: []
      }
      user_league_memberships: {
        Row: {
          created_at: string | null
          demoted: boolean | null
          id: string
          league_id: string
          month: number
          points_earned: number | null
          promoted: boolean | null
          rank_in_league: number | null
          updated_at: string | null
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string | null
          demoted?: boolean | null
          id?: string
          league_id: string
          month: number
          points_earned?: number | null
          promoted?: boolean | null
          rank_in_league?: number | null
          updated_at?: string | null
          user_id: string
          year: number
        }
        Update: {
          created_at?: string | null
          demoted?: boolean | null
          id?: string
          league_id?: string
          month?: number
          points_earned?: number | null
          promoted?: boolean | null
          rank_in_league?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "monthly_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voting_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string
          end_date: string
          icon: string | null
          id: string
          is_active: boolean
          points_reward: number
          start_date: string
          target_value: number
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description: string
          end_date: string
          icon?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          start_date: string
          target_value?: number
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string
          end_date?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          points_reward?: number
          start_date?: string
          target_value?: number
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_points: {
        Args: { _points: number; _reason?: string; _user_id: string }
        Returns: number
      }
      check_and_award_badges: { Args: { _user_id: string }; Returns: string[] }
      check_cnpj_availability: { Args: { cnpj_input: string }; Returns: Json }
      create_department_notification: {
        Args: {
          p_company_id: string
          p_data?: Json
          p_department: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      get_admin_user_stats: {
        Args: never
        Returns: {
          avg_age: number
          high_stress_users: number
          new_users_month: number
          new_users_week: number
          total_users: number
          users_with_avatar: number
        }[]
      }
      get_company_dashboard_stats: {
        Args: { _company_id: string }
        Returns: {
          active_employees: number
          avg_level: number
          avg_stress_level: number
          challenges_completed: number
          total_employees: number
          total_points: number
          weekly_active_users: number
        }[]
      }
      get_company_leaderboard: {
        Args: { _company_id: string; _limit?: number }
        Returns: {
          avatar_url: string
          department: string
          full_name: string
          level: number
          points: number
          rank: number
          user_id: string
        }[]
      }
      get_company_members_for_hr: {
        Args: { _user_id: string }
        Returns: {
          member_company_id: string
          member_user_id: string
        }[]
      }
      get_engagement_metrics: {
        Args: { days_back?: number }
        Returns: {
          avg_stress_level: number
          avg_user_level: number
          total_points_awarded: number
          users_with_high_engagement: number
        }[]
      }
      get_invitation_stats: {
        Args: never
        Returns: {
          accepted_invitations: number
          expired_invitations: number
          pending_invitations: number
          total_invitations: number
        }[]
      }
      get_league_leaderboard: {
        Args: { p_limit?: number; p_tier: string }
        Returns: {
          avatar_url: string
          department: string
          full_name: string
          points_earned: number
          rank_position: number
          user_id: string
        }[]
      }
      get_manager_team_members: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_monthly_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          challenges_completed: number
          full_name: string
          rank: number
          total_points: number
          user_id: string
        }[]
      }
      get_monthly_ranking: {
        Args: { _company_id?: string; _limit?: number }
        Returns: {
          avatar_url: string
          company_name: string
          full_name: string
          monthly_points: number
          rank: number
          user_id: string
        }[]
      }
      get_queen_candidates: {
        Args: { p_year?: number }
        Returns: {
          avatar_url: string
          combined_score: number
          full_name: string
          rank: number
          total_points: number
          user_id: string
          vote_count: number
        }[]
      }
      get_unread_league_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_competition_history: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          bonus_points_received: number
          final_points: number
          final_rank: number
          league_tier: string
          month: number
          reward_received: string
          was_demoted: boolean
          was_promoted: boolean
          year: number
        }[]
      }
      get_user_growth_stats: {
        Args: { days_back?: number }
        Returns: {
          cumulative_users: number
          new_users: number
          stat_date: string
        }[]
      }
      get_user_league: {
        Args: { p_user_id: string }
        Returns: {
          color: string
          icon: string
          league_id: string
          league_name: string
          points_earned: number
          rank_in_league: number
          tier: string
        }[]
      }
      get_user_league_streaks: {
        Args: { p_user_id: string }
        Returns: {
          best_streak: number
          bonus_multiplier: number
          current_streak: number
          streak_type: string
        }[]
      }
      get_user_referral_stats: {
        Args: { p_user_id: string }
        Returns: {
          pending_referrals: number
          referral_code: string
          successful_referrals: number
          total_points_earned: number
          total_referrals: number
        }[]
      }
      get_voting_statistics: {
        Args: { p_year?: number }
        Returns: {
          days_remaining: number
          is_voting_open: boolean
          participation_rate: number
          total_eligible_voters: number
          total_votes_cast: number
          voting_end_date: string
          voting_start_date: string
        }[]
      }
      get_weekly_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          challenges_completed: number
          full_name: string
          rank: number
          total_points: number
          user_id: string
        }[]
      }
      get_weekly_ranking: {
        Args: { _company_id?: string; _limit?: number }
        Returns: {
          avatar_url: string
          company_name: string
          full_name: string
          rank: number
          user_id: string
          weekly_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_voted_for_queen: {
        Args: { p_user_id: string; p_year?: number }
        Returns: boolean
      }
      is_company_hr_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_manager: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_voting_open: { Args: { p_year?: number }; Returns: boolean }
      process_monthly_ambassador: { Args: never; Returns: undefined }
      process_monthly_ranking: { Args: never; Returns: undefined }
      process_weekly_ranking: { Args: never; Returns: undefined }
      process_yearly_queen: { Args: never; Returns: undefined }
      redeem_reward: {
        Args: { _reward_id: string; _user_id: string }
        Returns: Json
      }
      validate_cnpj: { Args: { cnpj_input: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      company_role: "hr_admin" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      company_role: ["hr_admin", "manager", "employee"],
    },
  },
} as const
