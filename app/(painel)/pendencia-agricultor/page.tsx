"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./pendencia.css";

type Pendencia = {
  id_operação: number | string;
  status?: string | null;
  data_validade?: string | null;
  quantidade?: number | string;
  data_operação?: string | null;
  semente?: { tipo: string; subtipo: string };
  recurso?: { nome_recurso: string };
};

function formatarData(dataIso?: string | null) {
  if (!dataIso) return "-";
  return new Date(dataIso).toLocaleDateString("pt-BR");
}

function descreverItem(pendencia: Pendencia) {
  if (pendencia.semente) {
    return `${pendencia.semente.tipo} - ${pendencia.semente.subtipo}`;
  }
  if (pendencia.recurso) {
    return pendencia.recurso.nome_recurso;
  }
  return "Item não encontrado";
}

// Regra de devolução: sementes devolvem o DOBRO, recursos devolvem o mesmo valor
function quantidadeADevolver(pendencia: Pendencia) {
  const retirada = Number(pendencia.quantidade);
  return pendencia.semente ? retirada * 2 : retirada;
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

// Busca as pendências do agricultor e junta operação, semente e recurso
async function buscarPendencias(cpf: string): Promise<Pendencia[]> {
  // 1) operações do agricultor que geraram pendência
  const { data: operacoes, error: erroOperacoes } = await supabase
    .from("operação")
    .select("*")
    .eq("cpf_agricultor", cpf)
    .not("id_pendência", "is", null);

  if (erroOperacoes) throw new Error(erroOperacoes.message);
  if (!operacoes || operacoes.length === 0) return [];

  const idsOperacoes = operacoes.map((o) => o["id_operação"]);

  // 2) as pendências ligadas a essas operações
  const { data: pendencias, error: erroPendencias } = await supabase
    .from("pendência")
    .select("*")
    .in("id_operação", idsOperacoes)
    .order("data_validade", { ascending: true });

  if (erroPendencias) throw new Error(erroPendencias.message);
  if (!pendencias || pendencias.length === 0) return [];

  // 3) nome das sementes e recursos
  const idsSementes = [
    ...new Set(operacoes.map((o) => o.id_semente).filter((v) => v != null)),
  ];
  const idsRecursos = [
    ...new Set(operacoes.map((o) => o.id_recurso).filter((v) => v != null)),
  ];

  const [sementes, recursos] = await Promise.all([
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
  ]);

  return pendencias.map((p) => {
    const operacao = operacoes.find(
      (o) => o["id_operação"] === p["id_operação"],
    );

    return {
      ...p,
      quantidade: operacao?.quantidade,
      data_operação: operacao?.data_operação,
      semente: sementes.find((s) => s.id_semente === operacao?.id_semente),
      recurso: recursos.find((r) => r.id_recurso === operacao?.id_recurso),
    };
  });
}

function PendenciasConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cpf = searchParams.get("cpf");
  const nome = searchParams.get("nome");

  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [status, setStatus] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  useEffect(() => {
    if (!cpf) {
      router.replace("/monitorar-agricultores");
      return;
    }

    buscarPendencias(cpf)
      .then((lista) => {
        setPendencias(lista);
        setStatus("ok");
      })
      .catch((erro) => {
        setStatus("erro");
        console.error(erro);
      });
  }, [cpf, router]);

  return (
    <>
      <Link href="/monitorar-agricultores" className="pen-voltar">
        &lt; Voltar
      </Link>

      <h1 className="pen-titulo">
        {nome ? `Pendências de ${nome}` : "Pendências"}
      </h1>

      <div className="pen-lista">
        {status === "carregando" && (
          <p className="pen-carregando">Carregando...</p>
        )}

        {status === "erro" && (
          <p className="pen-carregando">
            Não foi possível carregar as pendências.
          </p>
        )}

        {status === "ok" && pendencias.length === 0 && (
          <p className="pen-carregando">Nenhuma pendência encontrada.</p>
        )}

        {status === "ok" &&
          pendencias.map((pendencia) => (
            <div key={pendencia["id_operação"]} className="pen-card">
              <div className="pen-topo">
                <span className="pen-badge pen-badge-solicitacao">
                  Solicitação
                </span>
                <span className="pen-data">
                  Retirado em {formatarData(pendencia.data_operação)}
                </span>
              </div>

              <p className="pen-item">{descreverItem(pendencia)}</p>
              <p className="pen-quantidade">Retirou: {pendencia.quantidade}</p>
              <p className="pen-quantidade">
                Deve devolver: {quantidadeADevolver(pendencia)}
              </p>
              <p className="pen-quantidade">
                Prazo: {formatarData(pendencia.data_validade)}
              </p>

              {pendencia.status && (
                <span className={`pen-status pen-status-${pendencia.status}`}>
                  {pendencia.status}
                </span>
              )}
            </div>
          ))}
      </div>
    </>
  );
}

export default function PendenciaAgricultorPage() {
  return (
    <Suspense fallback={<p className="pen-carregando">Carregando...</p>}>
      <PendenciasConteudo />
    </Suspense>
  );
}
