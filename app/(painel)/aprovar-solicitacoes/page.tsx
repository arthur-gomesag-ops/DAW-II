"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./aprovar.css";

type Operacao = {
  id_operação: number;
  tipo: string;
  data_operação: string;
  quantidade: number | string;
  cpf_agricultor: string;
  id_semente?: number | string | null;
  id_recurso?: number | string | null;
  semente?: { tipo: string; subtipo: string };
  recurso?: { nome_recurso: string };
  nome_agricultor: string;
  telefone_agricultor: string | null;
};

function descreverItem(operacao: Operacao) {
  if (operacao.semente) {
    return `${operacao.semente.tipo} - ${operacao.semente.subtipo}`;
  }
  if (operacao.recurso) {
    return operacao.recurso.nome_recurso;
  }
  return "Item não encontrado";
}

function formatarData(dataIso: string) {
  const data = new Date(dataIso);
  return (
    data.toLocaleDateString("pt-BR") +
    " às " +
    data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

// link do whatsapp
function montarLinkWhatsapp(telefone: string) {
  const somenteNumeros = String(telefone).replace(/\D/g, "");
  return `https://wa.me/55${somenteNumeros}`;
}

async function buscarPorIds<T>(
  tabela: string,
  coluna: string,
  ids: unknown[],
): Promise<T[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from(tabela)
    .select("*")
    .in(coluna, ids);

  if (error) throw new Error(error.message);

  return (data ?? []) as T[];
}

// Busca as operações pendentes e junta semente, recurso e agricultor
async function buscarOperacoesPendentes(): Promise<Operacao[]> {
  const { data: operacoes, error } = await supabase
    .from("operação")
    .select("*")
    .eq("status", "pendente")
    .order("data_operação", { ascending: true });

  if (error) throw new Error(error.message);
  if (!operacoes || operacoes.length === 0) return [];

  const idsSementes = [
    ...new Set(operacoes.map((o) => o.id_semente).filter((v) => v != null)),
  ];
  const idsRecursos = [
    ...new Set(operacoes.map((o) => o.id_recurso).filter((v) => v != null)),
  ];
  const cpfs = [
    ...new Set(operacoes.map((o) => o.cpf_agricultor).filter((v) => v != null)),
  ];

  const [sementes, recursos, agricultores] = await Promise.all([
    buscarPorIds<{
      id_semente: number | string;
      tipo: string;
      subtipo: string;
    }>("semente", "id_semente", idsSementes),
    buscarPorIds<{ id_recurso: number | string; nome_recurso: string }>(
      "recurso",
      "id_recurso",
      idsRecursos,
    ),
    buscarPorIds<{
      cpf_agricultor: string;
      nome: string;
      telefone: string | null;
    }>("agricultor", "cpf_agricultor", cpfs),
  ]);

  return operacoes.map((o) => {
    const agricultor = agricultores.find(
      (a) => a.cpf_agricultor === o.cpf_agricultor,
    );

    return {
      ...o,
      semente: sementes.find((s) => s.id_semente === o.id_semente),
      recurso: recursos.find((r) => r.id_recurso === o.id_recurso),
      nome_agricultor: agricultor?.nome ?? "Agricultor",
      telefone_agricultor: agricultor?.telefone ?? null,
    };
  });
}

export default function AprovarSolicitacoesPage() {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [status, setStatus] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );
  const [processando, setProcessando] = useState<number | null>(null);

  useEffect(() => {
    buscarOperacoesPendentes()
      .then((lista) => {
        setOperacoes(lista);
        setStatus("ok");
      })
      .catch((erro) => {
        setStatus("erro");
        console.error(erro);
      });
  }, []);

  // aprovar ou recusar
  // A regra (estoque + pendência de devolução) roda no banco,
  // na função "decidir_operacao", numa única transação.
  async function processarOperacao(id: number, aprovar: boolean) {
    setProcessando(id);

    try {
      const { error } = await supabase.rpc("decidir_operacao", {
        p_id: id,
        p_aprovar: aprovar,
      });

      if (error) {
        alert(error.message || "Não foi possível concluir a ação.");
        return;
      }

      setOperacoes((atuais) => atuais.filter((o) => o["id_operação"] !== id));
    } catch (erro) {
      alert("Não foi possível concluir a ação.");
      console.error(erro);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <h1 className="apr-titulo">Aprovar solicitações e doações</h1>

      <div className="apr-lista">
        {status === "carregando" && (
          <p className="apr-carregando">Carregando...</p>
        )}

        {status === "erro" && (
          <p className="apr-carregando">
            Não foi possível carregar as operações.
          </p>
        )}

        {status === "ok" && operacoes.length === 0 && (
          <p className="apr-carregando">
            Nenhuma operação pendente no momento.
          </p>
        )}

        {status === "ok" &&
          operacoes.map((operacao) => {
            const id = operacao["id_operação"];
            const ehDoacao = operacao.tipo === "doação";

            return (
              <div key={id} className="apr-card">
                <div className="apr-topo">
                  <span
                    className={`apr-badge ${ehDoacao ? "apr-badge-doacao" : "apr-badge-solicitacao"}`}
                  >
                    {ehDoacao ? "Doação" : "Solicitação"}
                  </span>
                  <span className="apr-data">
                    {formatarData(operacao.data_operação)}
                  </span>
                </div>

                <div className="apr-corpo">
                  <p className="apr-nome">{operacao.nome_agricultor}</p>
                  <p className="apr-item">{descreverItem(operacao)}</p>
                  <p className="apr-quantidade">
                    Quantidade: {operacao.quantidade}
                  </p>
                </div>

                <div className="apr-rodape">
                  {operacao.telefone_agricultor ? (
                    <a
                      className="apr-contato"
                      href={montarLinkWhatsapp(operacao.telefone_agricultor)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contatar via WhatsApp
                    </a>
                  ) : (
                    <span className="apr-sem-contato">Sem telefone</span>
                  )}

                  <div className="apr-acoes">
                    <button
                      className="apr-recusar"
                      disabled={processando === id}
                      onClick={() => processarOperacao(id, false)}
                    >
                      Recusar
                    </button>
                    <button
                      className="apr-aprovar"
                      disabled={processando === id}
                      onClick={() => processarOperacao(id, true)}
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
