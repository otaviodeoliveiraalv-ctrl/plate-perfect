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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string | null
          telefone: string | null
          tenant_id: string
        }
        Insert: {
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          tenant_id: string
        }
        Update: {
          bairro?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      item_opcoes: {
        Row: {
          created_at: string
          id: string
          ingredientes: string | null
          item_id: string
          nome: string
          ordem: number
          preco_adicional: number
          tipo_opcao: Database["public"]["Enums"]["opcao_tipo"]
        }
        Insert: {
          created_at?: string
          id?: string
          ingredientes?: string | null
          item_id: string
          nome: string
          ordem?: number
          preco_adicional?: number
          tipo_opcao: Database["public"]["Enums"]["opcao_tipo"]
        }
        Update: {
          created_at?: string
          id?: string
          ingredientes?: string | null
          item_id?: string
          nome?: string
          ordem?: number
          preco_adicional?: number
          tipo_opcao?: Database["public"]["Enums"]["opcao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "item_opcoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
        ]
      }
      itens: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          descricao: string | null
          foto_url: string | null
          id: string
          ingredientes: string | null
          nome: string
          ordem: number
          preco: number
          tenant_id: string
          tipo: Database["public"]["Enums"]["item_tipo"]
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          ingredientes?: string | null
          nome: string
          ordem?: number
          preco?: number
          tenant_id: string
          tipo?: Database["public"]["Enums"]["item_tipo"]
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          descricao?: string | null
          foto_url?: string | null
          id?: string
          ingredientes?: string | null
          nome?: string
          ordem?: number
          preco?: number
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["item_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          numero: number
          tenant_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          numero: number
          tenant_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          numero?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          id: string
          item_id: string | null
          nome_item: string
          observacoes: string | null
          pedido_id: string
          personalizacao: Json | null
          preco_total: number
          preco_unitario: number
          quantidade: number
        }
        Insert: {
          id?: string
          item_id?: string | null
          nome_item: string
          observacoes?: string | null
          pedido_id: string
          personalizacao?: Json | null
          preco_total: number
          preco_unitario: number
          quantidade?: number
        }
        Update: {
          id?: string
          item_id?: string | null
          nome_item?: string
          observacoes?: string | null
          pedido_id?: string
          personalizacao?: Json | null
          preco_total?: number
          preco_unitario?: number
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          bairro_entrega: string | null
          cliente_id: string | null
          created_at: string
          endereco_entrega: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          mesa_id: string | null
          mesa_numero: number | null
          nome_cliente: string | null
          numero: number
          observacoes: string | null
          origem: Database["public"]["Enums"]["pedido_origem"]
          status: Database["public"]["Enums"]["pedido_status"]
          subtotal: number
          taxa_entrega: number
          telefone_cliente: string | null
          tempo_estimado_minutos: number | null
          tenant_id: string
          total: number
          troco_para: number | null
          updated_at: string
        }
        Insert: {
          bairro_entrega?: string | null
          cliente_id?: string | null
          created_at?: string
          endereco_entrega?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          mesa_id?: string | null
          mesa_numero?: number | null
          nome_cliente?: string | null
          numero?: number
          observacoes?: string | null
          origem: Database["public"]["Enums"]["pedido_origem"]
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          taxa_entrega?: number
          telefone_cliente?: string | null
          tempo_estimado_minutos?: number | null
          tenant_id: string
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Update: {
          bairro_entrega?: string | null
          cliente_id?: string | null
          created_at?: string
          endereco_entrega?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          mesa_id?: string | null
          mesa_numero?: number | null
          nome_cliente?: string | null
          numero?: number
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["pedido_origem"]
          status?: Database["public"]["Enums"]["pedido_status"]
          subtotal?: number
          taxa_entrega?: number
          telefone_cliente?: string | null
          tempo_estimado_minutos?: number | null
          tenant_id?: string
          total?: number
          troco_para?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          delivery_ativo: boolean
          descricao: string | null
          endereco: string | null
          formas_pagamento: Database["public"]["Enums"]["forma_pagamento"][]
          horario_funcionamento: Json
          id: string
          logo_url: string | null
          mesa_ativo: boolean
          nome: string
          pedido_minimo: number
          regra_dois_sabores: string
          slug: string
          taxa_entrega_fixa: number
          telefone: string | null
          tempo_estimado_entrega_minutos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_ativo?: boolean
          descricao?: string | null
          endereco?: string | null
          formas_pagamento?: Database["public"]["Enums"]["forma_pagamento"][]
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          mesa_ativo?: boolean
          nome: string
          pedido_minimo?: number
          regra_dois_sabores?: string
          slug: string
          taxa_entrega_fixa?: number
          telefone?: string | null
          tempo_estimado_entrega_minutos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_ativo?: boolean
          descricao?: string | null
          endereco?: string | null
          formas_pagamento?: Database["public"]["Enums"]["forma_pagamento"][]
          horario_funcionamento?: Json
          id?: string
          logo_url?: string | null
          mesa_ativo?: boolean
          nome?: string
          pedido_minimo?: number
          regra_dois_sabores?: string
          slug?: string
          taxa_entrega_fixa?: number
          telefone?: string | null
          tempo_estimado_entrega_minutos?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          created_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      forma_pagamento: "pix" | "dinheiro" | "cartao_entrega"
      item_tipo: "simples" | "personalizavel"
      opcao_tipo: "tamanho" | "massa" | "sabor" | "complemento"
      pedido_origem: "mesa" | "delivery"
      pedido_status:
        | "recebido"
        | "confirmado"
        | "em_preparo"
        | "pronto"
        | "saiu_entrega"
        | "entregue"
        | "cancelado"
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
      forma_pagamento: ["pix", "dinheiro", "cartao_entrega"],
      item_tipo: ["simples", "personalizavel"],
      opcao_tipo: ["tamanho", "massa", "sabor", "complemento"],
      pedido_origem: ["mesa", "delivery"],
      pedido_status: [
        "recebido",
        "confirmado",
        "em_preparo",
        "pronto",
        "saiu_entrega",
        "entregue",
        "cancelado",
      ],
    },
  },
} as const
