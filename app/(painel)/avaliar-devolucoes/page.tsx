"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "../aprovar-solicitacoes/aprovar.css";

type Devolucao = {
  id_pendência: number;
  id_operação: number;
  data_validade: string;
  quantidade?: number | string;
  semente?: { tipo: string; subtipo: string };
  recurso?: { nome_recurso: string };
  nome_agricultor: string;
  telefone_agricultor: string | null;
  atrasada: boolean;
};

function descreverItem(d: Devolucao) {
  if (d.semente) return `${d.semente.tipo} - ${d.semente.subtipo}`;
  if (d.recurso) return d.recurso.nome_recurso;
  return "Item não encontrado";
}

// Regra: sementes devolvem o DOBRO, recursos devolvem o mesmo valor
function quantidadeADevolver(d: Devolucao) {
  const retirada = Number(d.quantidade);
  return d.semente ? retirada * 2 : retirada;
}

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "-";
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

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

// Pendências abertas + operação, item e agricultor de cada uma
async function buscarDevolucoesPendentes(): Promise<Devolucao[]> {
  const { data: pendencias, error } = await supabase
    .from("pendência")
    .select("*")
    .eq("status", "pendente")
    .order("data_validade", { ascending: true });

  if (error) throw new Error(error.message);
  if (!pendencias || pendencias.length === 0) return [];

  const idsOperacoes = pendencias.map((p) => p["id_operação"]);

  const { data: operacoes, error: erroOperacoes } = await supabase
    .from("operação")
    .select("*")
    .in("id_operação", idsOperacoes);

  if (erroOperacoes) throw new Error(erroOperacoes.message);

  const ops = operacoes ?? [];

  const idsSementes = [
    ...new Set(ops.map((o) => o.id_semente).filter((v) => v != null)),
  ];
  const idsRecursos = [
    ...new Set(ops.map((o) => o.id_recurso).filter((v) => v != null)),
  ];
  const cpfs = [
    ...new Set(ops.map((o) => o.cpf_agricultor).filter((v) => v != null)),
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

  const agora = new Date();

  return pendencias.map((p) => {
    const op = ops.find((o) => o["id_operação"] === p["id_operação"]);
    const agricultor = agricultores.find(
      (a) => a.cpf_agricultor === op?.cpf_agricultor,
    );

    return {
      ...p,
      quantidade: op?.quantidade,
      semente: sementes.find((s) => s.id_semente === op?.id_semente),
      recurso: recursos.find((r) => r.id_recurso === op?.id_recurso),
      nome_agricultor: agricultor?.nome ?? "Agricultor",
      telefone_agricultor: agricultor?.telefone ?? null,
      atrasada: new Date(p.data_validade) < agora,
    };
  });
}

export default function AvaliarDevolucoesPage() {
  const [devolucoes, setDevolucoes] = useState<Devolucao[]>([]);
  const [status, setStatus] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );
  const [processando, setProcessando] = useState<number | null>(null);

  useEffect(() => {
    buscarDevolucoesPendentes()
      .then((lista) => {
        setDevolucoes(lista);
        setStatus("ok");
      })
      .catch((erro) => {
        setStatus("erro");
        console.error(erro);
      });
  }, []);

  // A regra (voltar ao estoque + encerrar a pendência) roda no banco,
  // na função "confirmar_devolucao", numa única transação.
  async function confirmarDevolucao(d: Devolucao) {
    const id = d["id_pendência"];

    const confirmar = confirm(
      `Confirmar que ${d.nome_agricultor} devolveu tudo? (Deve devolver: ${quantidadeADevolver(d)})\nO estoque será atualizado.`,
    );
    if (!confirmar) return;

    setProcessando(id);

    try {
      const { error } = await supabase.rpc("confirmar_devolucao", {
        p_id_pendencia: id,
      });

      if (error) {
        alert(error.message || "Não foi possível confirmar a devolução.");
        return;
      }

      setDevolucoes((atuais) => atuais.filter((x) => x["id_pendência"] !== id));
    } catch (erro) {
      alert("Não foi possível confirmar a devolução.");
      console.error(erro);
    } finally {
      setProcessando(null);
    }
  }

  return (
    <>
      <h1 className="apr-titulo">Avaliar devoluções</h1>

      <div className="apr-lista">
        {status === "carregando" && (
          <p className="apr-carregando">Carregando...</p>
        )}

        {status === "erro" && (
          <p className="apr-carregando">
            Não foi possível carregar as devoluções.
          </p>
        )}

        {status === "ok" && devolucoes.length === 0 && (
          <p className="apr-carregando">
            Nenhuma devolução pendente no momento.
          </p>
        )}

        {status === "ok" &&
          devolucoes.map((d) => {
            const id = d["id_pendência"];

            return (
              <div key={id} className="apr-card">
                <div className="apr-topo">
                  <span className="apr-badge apr-badge-solicitacao">
                    Devolução
                  </span>
                  <span
                    className="apr-data"
                    style={
                      d.atrasada
                        ? { color: "#d32f2f", fontWeight: "bold" }
                        : undefined
                    }
                  >
                    Prazo: {formatarData(d.data_validade)}
                    {d.atrasada ? " · Atrasada" : ""}
                  </span>
                </div>

                <div className="apr-corpo">
                  <p className="apr-nome">{d.nome_agricultor}</p>
                  <p className="apr-item">{descreverItem(d)}</p>
                  <p className="apr-quantidade">Retirou: {d.quantidade}</p>
                  <p className="apr-quantidade">
                    Deve devolver: {quantidadeADevolver(d)}
                  </p>
                </div>

                <div className="apr-rodape">
                  {d.telefone_agricultor ? (
                    <a
                      className="apr-contato"
                      href={montarLinkWhatsapp(d.telefone_agricultor)}
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
                      className="apr-aprovar"
                      disabled={processando === id}
                      onClick={() => confirmarDevolucao(d)}
                    >
                      Confirmar devolução
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
