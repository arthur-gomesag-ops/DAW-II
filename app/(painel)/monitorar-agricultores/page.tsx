"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./monitorar.css";

type Agricultor = {
  cpf_agricultor: string;
  nome: string;
  pendencias: number;
};

type PendenciaAberta = { id_operação: number | string };
type Operacao = { id_operação: number | string; cpf_agricultor: string };

// Busca os agricultores e conta quantas pendências ABERTAS cada um tem
// (pendências já devolvidas não entram na conta)
async function buscarAgricultoresComPendencias(): Promise<Agricultor[]> {
  const [agricultores, abertas, operacoes] = await Promise.all([
    supabase.from("agricultor").select("*").order("nome", { ascending: true }),
    supabase.from("pendência").select("*").eq("status", "pendente"),
    supabase.from("operação").select("*").not("id_pendência", "is", null),
  ]);

  if (agricultores.error) throw new Error(agricultores.error.message);
  if (abertas.error) throw new Error(abertas.error.message);
  if (operacoes.error) throw new Error(operacoes.error.message);

  const idsAbertos = new Set(
    ((abertas.data ?? []) as PendenciaAberta[]).map((p) => p["id_operação"]),
  );

  const contagem: Record<string, number> = {};
  for (const op of (operacoes.data ?? []) as Operacao[]) {
    if (idsAbertos.has(op["id_operação"])) {
      contagem[op.cpf_agricultor] = (contagem[op.cpf_agricultor] ?? 0) + 1;
    }
  }

  return ((agricultores.data ?? []) as Agricultor[]).map((a) => ({
    ...a,
    pendencias: contagem[a.cpf_agricultor] ?? 0,
  }));
}

export default function MonitorarAgricultoresPage() {
  const [agricultores, setAgricultores] = useState<Agricultor[]>([]);
  const [status, setStatus] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );

  useEffect(() => {
    async function carregar() {
      try {
        const lista = await buscarAgricultoresComPendencias();
        setAgricultores(lista);
        setStatus("ok");
      } catch (erro) {
        setStatus("erro");
        console.error(erro);
      }
    }

    carregar();
  }, []);

  return (
    <>
      <h1 className="mon-titulo">Monitoramento</h1>

      <div className="mon-cabecalho">
        <span>Agricultor</span>
        <span>Acessar Pendências</span>
      </div>

      <div className="mon-lista">
        {status === "carregando" && (
          <p className="mon-carregando">Carregando...</p>
        )}

        {status === "erro" && (
          <p className="mon-carregando">
            Não foi possível carregar os agricultores.
          </p>
        )}

        {status === "ok" && agricultores.length === 0 && (
          <p className="mon-carregando">Nenhum agricultor cadastrado ainda.</p>
        )}

        {status === "ok" &&
          agricultores.map((agricultor) => (
            <Link
              key={agricultor.cpf_agricultor}
              href={`/pendencia-agricultor?cpf=${encodeURIComponent(agricultor.cpf_agricultor)}&nome=${encodeURIComponent(agricultor.nome)}`}
              className="mon-linha"
            >
              <span className="mon-nome">{agricultor.nome}</span>
              <span className="mon-contagem">
                {agricultor.pendencias} pendência
                {agricultor.pendencias === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
      </div>
    </>
  );
}
