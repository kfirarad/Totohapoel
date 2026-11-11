export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      columns: {
        Row: {
          created_at: string;
          deadline: string;
          games: NonNullable<Json>;
          group_id: string | null;
          id: string;
          is_active: boolean;
          max_doubles: number;
          max_triples: number;
          name: string;
          toto_type_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          deadline: string;
          games?: NonNullable<Json>;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          max_doubles?: number;
          max_triples?: number;
          name: string;
          toto_type_id?: string | null;
        };
        Update: {
          created_at?: string;
          deadline?: string;
          games?: NonNullable<Json>;
          group_id?: string | null;
          id?: string;
          is_active?: boolean;
          max_doubles?: number;
          max_triples?: number;
          name?: string;
          toto_type_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "columns_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "columns_toto_type_id_fkey";
            columns: ["toto_type_id"];
            isOneToOne: false;
            referencedRelation: "toto_types";
            referencedColumns: ["id"];
          },
        ];
      };
      group_bets: {
        Row: {
          bet_values: NonNullable<Json>;
          column_id: string;
          correct_guesses: number | null;
          group_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          bet_values: NonNullable<Json>;
          column_id: string;
          correct_guesses?: number | null;
          group_id: string;
          updated_at?: string;
        };
        Update: {
          bet_values?: NonNullable<Json>;
          column_id?: string;
          correct_guesses?: number | null;
          group_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_bets_column_id_fkey";
            columns: ["column_id"];
            isOneToOne: false;
            referencedRelation: "columns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_bets_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          role: string;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          joined_at?: string;
          role?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          role?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      group_types: {
        Row: {
          group_id: string;
          toto_type_id: string;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          toto_type_id: string;
        };
        Update: {
          group_id?: string;
          toto_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_types_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_types_toto_type_id_fkey";
            columns: ["toto_type_id"];
            isOneToOne: false;
            referencedRelation: "toto_types";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_open: boolean;
          join_code: string;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_open?: boolean;
          join_code?: string;
          name: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_open?: boolean;
          join_code?: string;
          name?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          id: string;
          is_system_admin: boolean;
          last_group_id: string | null;
          locale: string;
          name: string;
          notify: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          id: string;
          is_system_admin?: boolean;
          last_group_id?: string | null;
          locale?: string;
          name?: string;
          notify?: NonNullable<Json>;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          id?: string;
          is_system_admin?: boolean;
          last_group_id?: string | null;
          locale?: string;
          name?: string;
          notify?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_last_group_id_fkey";
            columns: ["last_group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      push_tokens: {
        Row: {
          platform: string | null;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          platform?: string | null;
          token: string;
          user_id: string;
        };
        Update: {
          platform?: string | null;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_aliases: {
        Row: {
          en_name: string | null;
          he_name: string;
          scoreaxis_team_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          en_name?: string | null;
          he_name: string;
          scoreaxis_team_id?: string | null;
          updated_at?: string;
        };
        Update: {
          en_name?: string | null;
          he_name?: string;
          scoreaxis_team_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      toto_types: {
        Row: {
          code: string;
          country: string;
          default_max_doubles: number;
          default_max_triples: number;
          id: string;
          name_en: string;
          name_he: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          country?: string;
          default_max_doubles?: number;
          default_max_triples?: number;
          id?: string;
          name_en: string;
          name_he: string;
        };
        Update: {
          code?: string;
          country?: string;
          default_max_doubles?: number;
          default_max_triples?: number;
          id?: string;
          name_en?: string;
          name_he?: string;
        };
        Relationships: [];
      };
      user_bets: {
        Row: {
          bet_values: NonNullable<Json>;
          column_id: string;
          correct_guesses: number | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bet_values: NonNullable<Json>;
          column_id: string;
          correct_guesses?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bet_values?: NonNullable<Json>;
          column_id?: string;
          correct_guesses?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_bets_column_id_fkey";
            columns: ["column_id"];
            isOneToOne: false;
            referencedRelation: "columns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_bets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_member: { Args: { p_group_id: string; p_user_id: string }; Returns: undefined };
      can_see_profile: { Args: { p_user_id: string }; Returns: boolean };
      create_group: {
        Args: {
          p_avatar_url?: string;
          p_is_open: boolean;
          p_name: string;
          p_toto_type_ids: string[];
        };
        Returns: string;
      };
      delete_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      gen_join_code: { Args: Record<PropertyKey, never>; Returns: string };
      group_preview: {
        Args: { p_code: string };
        Returns: {
          avatar_url: string;
          id: string;
          is_member: boolean;
          is_open: boolean;
          member_count: number;
          name: string;
        }[];
      };
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean };
      is_member: { Args: { p_group_id: string }; Returns: boolean };
      is_system_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      join_group: { Args: { p_code: string }; Returns: string };
      leave_group: { Args: { p_group_id: string }; Returns: undefined };
      regenerate_code: { Args: { p_group_id: string }; Returns: string };
      reject_member: { Args: { p_group_id: string; p_user_id: string }; Returns: undefined };
      remove_member: { Args: { p_group_id: string; p_user_id: string }; Returns: undefined };
      require_admin: { Args: { p_group_id: string }; Returns: undefined };
      score_bet: { Args: { p_bet: Json; p_games: Json }; Returns: number };
      set_last_group: { Args: { p_group_id: string }; Returns: undefined };
      set_member_role: {
        Args: { p_group_id: string; p_role: string; p_user_id: string };
        Returns: undefined;
      };
      shares_group: { Args: { p_user_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
