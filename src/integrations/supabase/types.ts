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
      classificacoes_financeiras: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      contrato_custos: {
        Row: {
          cl: string
          contrato_id: string | null
          created_at: string | null
          custo_mao_obra: number | null
          custo_materiais: number | null
          custo_terceiros: number | null
          despesas_adm: number | null
          faturamento_bruto: number | null
          id: string
          impostos: number | null
          mes_referencia: string
        }
        Insert: {
          cl: string
          contrato_id?: string | null
          created_at?: string | null
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          despesas_adm?: number | null
          faturamento_bruto?: number | null
          id?: string
          impostos?: number | null
          mes_referencia: string
        }
        Update: {
          cl?: string
          contrato_id?: string | null
          created_at?: string | null
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          custo_terceiros?: number | null
          despesas_adm?: number | null
          faturamento_bruto?: number | null
          id?: string
          impostos?: number | null
          mes_referencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_custos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          ativo: boolean
          cl: string | null
          created_at: string | null
          id: string
          nome_contrato: string
        }
        Insert: {
          ativo?: boolean
          cl?: string | null
          created_at?: string | null
          id?: string
          nome_contrato: string
        }
        Update: {
          ativo?: boolean
          cl?: string | null
          created_at?: string | null
          id?: string
          nome_contrato?: string
        }
        Relationships: []
      }
      cotacao_aprovacoes: {
        Row: {
          cotacao_id: string
          created_at: string
          data_decisao: string | null
          id: string
          nivel: number
          observacao: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          cotacao_id: string
          created_at?: string
          data_decisao?: string | null
          id?: string
          nivel?: number
          observacao?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          cotacao_id?: string
          created_at?: string
          data_decisao?: string | null
          id?: string
          nivel?: number
          observacao?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_aprovacoes_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_aprovacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_fornecedores: {
        Row: {
          contato_id: string | null
          cotacao_id: string
          created_at: string
          data_envio: string | null
          data_resposta: string | null
          forma_envio: string | null
          fornecedor_id: string
          id: string
          observacoes: string | null
          status: string
        }
        Insert: {
          contato_id?: string | null
          cotacao_id: string
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          forma_envio?: string | null
          fornecedor_id: string
          id?: string
          observacoes?: string | null
          status?: string
        }
        Update: {
          contato_id?: string | null
          cotacao_id?: string
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          forma_envio?: string | null
          fornecedor_id?: string
          id?: string
          observacoes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_fornecedores_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "fornecedor_contatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_fornecedores_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_historico: {
        Row: {
          acao: string
          cotacao_id: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          id: string
          status_anterior: string | null
          status_novo: string | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          cotacao_id: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          cotacao_id?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          status_anterior?: string | null
          status_novo?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_historico_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_itens: {
        Row: {
          aplicacao: string | null
          codigo: string | null
          cotacao_id: string
          created_at: string
          descricao: string
          id: string
          marca: string | null
          modelo: string | null
          observacoes: string | null
          ordem: number
          quantidade: number
          unidade: string
          updated_at: string
        }
        Insert: {
          aplicacao?: string | null
          codigo?: string | null
          cotacao_id: string
          created_at?: string
          descricao: string
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          ordem?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          aplicacao?: string | null
          codigo?: string | null
          cotacao_id?: string
          created_at?: string
          descricao?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          ordem?: number
          quantidade?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_respostas: {
        Row: {
          codigo_fornecedor: string | null
          condicao_pagamento: string | null
          cotacao_id: string
          cotacao_item_id: string
          created_at: string
          desconto: number
          descricao_fornecedor: string | null
          disponibilidade: string | null
          escolhido: boolean
          fornecedor_id: string
          frete: number
          id: string
          impostos: number
          marca: string | null
          observacoes: string | null
          prazo_entrega: number | null
          preco: number | null
          preco_unitario: number
          quantidade: number
          total_item: number
          updated_at: string
          validade_proposta: string | null
        }
        Insert: {
          codigo_fornecedor?: string | null
          condicao_pagamento?: string | null
          cotacao_id: string
          cotacao_item_id: string
          created_at?: string
          desconto?: number
          descricao_fornecedor?: string | null
          disponibilidade?: string | null
          escolhido?: boolean
          fornecedor_id: string
          frete?: number
          id?: string
          impostos?: number
          marca?: string | null
          observacoes?: string | null
          prazo_entrega?: number | null
          preco?: number | null
          preco_unitario?: number
          quantidade?: number
          total_item?: number
          updated_at?: string
          validade_proposta?: string | null
        }
        Update: {
          codigo_fornecedor?: string | null
          condicao_pagamento?: string | null
          cotacao_id?: string
          cotacao_item_id?: string
          created_at?: string
          desconto?: number
          descricao_fornecedor?: string | null
          disponibilidade?: string | null
          escolhido?: boolean
          fornecedor_id?: string
          frete?: number
          id?: string
          impostos?: number
          marca?: string | null
          observacoes?: string | null
          prazo_entrega?: number | null
          preco?: number | null
          preco_unitario?: number
          quantidade?: number
          total_item?: number
          updated_at?: string
          validade_proposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_respostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_respostas_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "cotacao_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacao_respostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          created_at: string
          data_cotacao: string
          desconto: number
          equipamento_id: string | null
          finalidade: string | null
          finalizada_at: string | null
          fornecedor_escolhido_id: string | null
          frete: number
          horimetro: number | null
          id: string
          numero: string
          observacoes: string | null
          patrimonio: string | null
          placa: string | null
          setor: string | null
          solicitante_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          data_cotacao?: string
          desconto?: number
          equipamento_id?: string | null
          finalidade?: string | null
          finalizada_at?: string | null
          fornecedor_escolhido_id?: string | null
          frete?: number
          horimetro?: number | null
          id?: string
          numero: string
          observacoes?: string | null
          patrimonio?: string | null
          placa?: string | null
          setor?: string | null
          solicitante_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          data_cotacao?: string
          desconto?: number
          equipamento_id?: string | null
          finalidade?: string | null
          finalizada_at?: string | null
          fornecedor_escolhido_id?: string | null
          frete?: number
          horimetro?: number | null
          id?: string
          numero?: string
          observacoes?: string | null
          patrimonio?: string | null
          placa?: string | null
          setor?: string | null
          solicitante_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_fornecedor_escolhido_id_fkey"
            columns: ["fornecedor_escolhido_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custos: {
        Row: {
          categoria: string
          contrato: string | null
          contrato_id: string | null
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          valor: number
        }
        Insert: {
          categoria: string
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          valor: number
        }
        Update: {
          categoria?: string
          contrato?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_fotos: {
        Row: {
          caption: string | null
          created_at: string
          equipamento_id: string
          id: string
          manutencao_historico_id: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          equipamento_id: string
          id?: string
          manutencao_historico_id?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          equipamento_id?: string
          id?: string
          manutencao_historico_id?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_fotos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_fotos_manutencao_historico_id_fkey"
            columns: ["manutencao_historico_id"]
            isOneToOne: false
            referencedRelation: "manutencao_historico"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          afericao_taco: string | null
          ano: string | null
          cartao_ticket: string | null
          cl: string | null
          cnh: string | null
          cover_storage_path: string | null
          created_at: string
          data_horimetro_atual: string | null
          data_ultima_revisao: string | null
          eixo_oleo: string | null
          filtro_ar_cond1: string | null
          filtro_ar_cond2: string | null
          filtro_ar_ext: string | null
          filtro_ar_int: string | null
          filtro_diesel_p: string | null
          filtro_diesel_s: string | null
          filtro_hidr: string | null
          filtro_lub: string | null
          filtro_respiro: string | null
          filtro_sep_agua: string | null
          filtro_trans: string | null
          h_revisao: number | null
          hidraulico_oleo: string | null
          horimetro_atual: number | null
          hr_rodado: number | null
          id: string
          identificacao: string | null
          item: number | null
          limite_revisao: number
          localizacao: string | null
          modelo: string | null
          motor_oleo: string | null
          numero: string
          observacoes: string | null
          operador_contato: string | null
          placa: string | null
          proxima_revisao_horimetro: number | null
          status: string | null
          tandem_oleo: string | null
          telefone: string | null
          transmissao_oleo: string | null
          u_revisao: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          afericao_taco?: string | null
          ano?: string | null
          cartao_ticket?: string | null
          cl?: string | null
          cnh?: string | null
          cover_storage_path?: string | null
          created_at?: string
          data_horimetro_atual?: string | null
          data_ultima_revisao?: string | null
          eixo_oleo?: string | null
          filtro_ar_cond1?: string | null
          filtro_ar_cond2?: string | null
          filtro_ar_ext?: string | null
          filtro_ar_int?: string | null
          filtro_diesel_p?: string | null
          filtro_diesel_s?: string | null
          filtro_hidr?: string | null
          filtro_lub?: string | null
          filtro_respiro?: string | null
          filtro_sep_agua?: string | null
          filtro_trans?: string | null
          h_revisao?: number | null
          hidraulico_oleo?: string | null
          horimetro_atual?: number | null
          hr_rodado?: number | null
          id?: string
          identificacao?: string | null
          item?: number | null
          limite_revisao?: number
          localizacao?: string | null
          modelo?: string | null
          motor_oleo?: string | null
          numero: string
          observacoes?: string | null
          operador_contato?: string | null
          placa?: string | null
          proxima_revisao_horimetro?: number | null
          status?: string | null
          tandem_oleo?: string | null
          telefone?: string | null
          transmissao_oleo?: string | null
          u_revisao?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          afericao_taco?: string | null
          ano?: string | null
          cartao_ticket?: string | null
          cl?: string | null
          cnh?: string | null
          cover_storage_path?: string | null
          created_at?: string
          data_horimetro_atual?: string | null
          data_ultima_revisao?: string | null
          eixo_oleo?: string | null
          filtro_ar_cond1?: string | null
          filtro_ar_cond2?: string | null
          filtro_ar_ext?: string | null
          filtro_ar_int?: string | null
          filtro_diesel_p?: string | null
          filtro_diesel_s?: string | null
          filtro_hidr?: string | null
          filtro_lub?: string | null
          filtro_respiro?: string | null
          filtro_sep_agua?: string | null
          filtro_trans?: string | null
          h_revisao?: number | null
          hidraulico_oleo?: string | null
          horimetro_atual?: number | null
          hr_rodado?: number | null
          id?: string
          identificacao?: string | null
          item?: number | null
          limite_revisao?: number
          localizacao?: string | null
          modelo?: string | null
          motor_oleo?: string | null
          numero?: string
          observacoes?: string | null
          operador_contato?: string | null
          placa?: string | null
          proxima_revisao_horimetro?: number | null
          status?: string | null
          tandem_oleo?: string | null
          telefone?: string | null
          transmissao_oleo?: string | null
          u_revisao?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      fornecedor_contatos: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          email: string | null
          fornecedor_id: string
          id: string
          nome: string
          observacoes: string | null
          principal: boolean
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          fornecedor_id: string
          id?: string
          nome: string
          observacoes?: string | null
          principal?: boolean
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          email?: string | null
          fornecedor_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          principal?: boolean
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fornecedor_contatos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          agencia: string | null
          ativo: boolean
          bairro: string | null
          banco: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          conta: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          pix: string | null
          razao_social: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          bairro?: string | null
          banco?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          pix?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      manutencao_historico: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          equipamento_id: string
          executante: string | null
          horimetro: number | null
          id: string
          itens: Json
          observacoes: string | null
          tipo_revisao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          equipamento_id: string
          executante?: string | null
          horimetro?: number | null
          id?: string
          itens?: Json
          observacoes?: string | null
          tipo_revisao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          equipamento_id?: string
          executante?: string | null
          horimetro?: number | null
          id?: string
          itens?: Json
          observacoes?: string | null
          tipo_revisao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_historico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_pendencias: {
        Row: {
          created_at: string
          descricao: string
          equipamento_id: string | null
          executado_por: string | null
          id: string
          registrado_por: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          equipamento_id?: string | null
          executado_por?: string | null
          id?: string
          registrado_por?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          equipamento_id?: string | null
          executado_por?: string | null
          id?: string
          registrado_por?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_pendencias_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencao_pendencias_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes_diarias: {
        Row: {
          contrato: string
          contrato_id: string | null
          created_at: string
          data: string
          equipamento: string
          id: number
          manha_final: number | null
          manha_inicio: number | null
          observacao: string | null
          operador: string
          tarde_final: number | null
          tarde_inicio: number | null
          valor_hora: number
        }
        Insert: {
          contrato: string
          contrato_id?: string | null
          created_at?: string
          data: string
          equipamento: string
          id?: number
          manha_final?: number | null
          manha_inicio?: number | null
          observacao?: string | null
          operador: string
          tarde_final?: number | null
          tarde_inicio?: number | null
          valor_hora?: number
        }
        Update: {
          contrato?: string
          contrato_id?: string | null
          created_at?: string
          data?: string
          equipamento?: string
          id?: number
          manha_final?: number | null
          manha_inicio?: number | null
          observacao?: string | null
          operador?: string
          tarde_final?: number | null
          tarde_inicio?: number | null
          valor_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_diarias_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          cl: string | null
          created_at: string
          created_by: string | null
          data: string | null
          descricao_produto: string | null
          equipamento: string | null
          equipamento_id: string | null
          fornecedor: string | null
          id: string
          identificacao: string | null
          nf: string | null
          observacao: string | null
          updated_at: string
          valor: number | null
          valor_total: number | null
          venc_01: string | null
          venc_02: string | null
          venc_03: string | null
          venc_04: string | null
          venc_05: string | null
          venc01: string | null
          venc02: string | null
          venc03: string | null
          venc04: string | null
          venc05: string | null
        }
        Insert: {
          cl?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          descricao_produto?: string | null
          equipamento?: string | null
          equipamento_id?: string | null
          fornecedor?: string | null
          id?: string
          identificacao?: string | null
          nf?: string | null
          observacao?: string | null
          updated_at?: string
          valor?: number | null
          valor_total?: number | null
          venc_01?: string | null
          venc_02?: string | null
          venc_03?: string | null
          venc_04?: string | null
          venc_05?: string | null
          venc01?: string | null
          venc02?: string | null
          venc03?: string | null
          venc04?: string | null
          venc05?: string | null
        }
        Update: {
          cl?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          descricao_produto?: string | null
          equipamento?: string | null
          equipamento_id?: string | null
          fornecedor?: string | null
          id?: string
          identificacao?: string | null
          nf?: string | null
          observacao?: string | null
          updated_at?: string
          valor?: number | null
          valor_total?: number | null
          venc_01?: string | null
          venc_02?: string | null
          venc_03?: string | null
          venc_04?: string | null
          venc_05?: string | null
          venc01?: string | null
          venc02?: string | null
          venc03?: string | null
          venc04?: string | null
          venc05?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais_permissoes: {
        Row: {
          created_at: string
          created_by: string | null
          gerenciar: boolean
          id: string
          updated_at: string
          user_id: string
          visualizar: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gerenciar?: boolean
          id?: string
          updated_at?: string
          user_id: string
          visualizar?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gerenciar?: boolean
          id?: string
          updated_at?: string
          user_id?: string
          visualizar?: boolean
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          data_vencimento: string | null
          dias: number | null
          equipamento_id: string | null
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          dias?: number | null
          equipamento_id?: string | null
          id?: string
          lida?: boolean
          mensagem: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          dias?: number | null
          equipamento_id?: string | null
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "tacografos_vencimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seguros: {
        Row: {
          contato_sinistro_nome: string | null
          contato_sinistro_telefone: string | null
          created_at: string
          data_vencimento: string
          id: string
          seguradora: string
          updated_at: string
          veiculo_equipamento: string
        }
        Insert: {
          contato_sinistro_nome?: string | null
          contato_sinistro_telefone?: string | null
          created_at?: string
          data_vencimento: string
          id?: string
          seguradora: string
          updated_at?: string
          veiculo_equipamento: string
        }
        Update: {
          contato_sinistro_nome?: string | null
          contato_sinistro_telefone?: string | null
          created_at?: string
          data_vencimento?: string
          id?: string
          seguradora?: string
          updated_at?: string
          veiculo_equipamento?: string
        }
        Relationships: []
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
    }
    Views: {
      seguros_alerta: {
        Row: {
          data_vencimento: string | null
          dias_para_vencer: number | null
          id: string | null
          seguradora: string | null
          status_alerta: string | null
          veiculo_equipamento: string | null
        }
        Insert: {
          data_vencimento?: string | null
          dias_para_vencer?: never
          id?: string | null
          seguradora?: string | null
          status_alerta?: never
          veiculo_equipamento?: string | null
        }
        Update: {
          data_vencimento?: string | null
          dias_para_vencer?: never
          id?: string | null
          seguradora?: string | null
          status_alerta?: never
          veiculo_equipamento?: string | null
        }
        Relationships: []
      }
      tacografos_vencimentos: {
        Row: {
          data_vencimento: string | null
          dias: number | null
          id: string | null
          identificacao: string | null
          numero: string | null
          situacao: string | null
          valor_original: string | null
        }
        Insert: {
          data_vencimento?: never
          dias?: never
          id?: string | null
          identificacao?: string | null
          numero?: string | null
          situacao?: never
          valor_original?: string | null
        }
        Update: {
          data_vencimento?: never
          dias?: never
          id?: string | null
          identificacao?: string | null
          numero?: string | null
          situacao?: never
          valor_original?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_notas_fiscais: { Args: never; Returns: boolean }
      can_view_notas_fiscais: { Args: never; Returns: boolean }
      gerar_notificacoes_tacografos: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "colaborador"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "colaborador"],
    },
  },
} as const
