"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import "./homepage.css";

// Conta linhas de uma tabela sem baixar os dados
async function contar(tabela: string, soComQuantidade: boolean) {
  const consulta = supabase
    .from(tabela)
    .select("*", { count: "exact", head: true });

  const { count, error } = soComQuantidade
    ? await consulta.gt("quantidade", 0)
    : await consulta;

  if (error) throw new Error(error.message);

  return count ?? 0;
}

async function carregarInfo(
  tabela: string,
  soComQuantidade: boolean,
  formatar: (total: number) => string,
  setInfo: (texto: string) => void,
) {
  try {
    const total = await contar(tabela, soComQuantidade);
    setInfo(formatar(total));
  } catch (erro) {
    setInfo("Não foi possível carregar");
    console.error(erro);
  }
}

export default function HomepagePage() {
  const [infoAgricultores, setInfoAgricultores] = useState("Carregando...");
  const [infoSementes, setInfoSementes] = useState("Carregando...");
  const [infoRecurso, setInfoRecurso] = useState("Carregando...");

  useEffect(() => {
    carregarInfo(
      "agricultor",
      false,
      (t) => `${t} agricultor${t === 1 ? "" : "es"}`,
      setInfoAgricultores,
    );

    carregarInfo(
      "semente",
      true,
      (t) =>
        `${t} semente${t === 1 ? "" : "s"} disponíve${t === 1 ? "l" : "is"}`,
      setInfoSementes,
    );

    carregarInfo(
      "recurso",
      true,
      (t) =>
        `${t} recurso${t === 1 ? "" : "s"} disponíve${t === 1 ? "l" : "is"}`,
      setInfoRecurso,
    );
  }, []);

  return (
    <>
      <h1 className="titulo">Serviços</h1>

      <div className="cards">
        <Link href="/monitorar-agricultores" className="card">
          <div className="card-titulo">Monitorar agricultores</div>
          <div className="card-info">{infoAgricultores}</div>
        </Link>

        <Link href="/adicionar-sementes" className="card">
          <div className="card-titulo">Gerenciar sementes</div>
          <div className="card-info">{infoSementes}</div>
        </Link>

        <Link href="/adicionar-recurso" className="card">
          <div className="card-titulo">Gerenciar recursos</div>
          <div className="card-info">{infoRecurso}</div>
        </Link>

        <Link href="/aprovar-solicitacoes" className="card">
          <div className="card-titulo">Aprovar solicitações e doações</div>
          <div className="card-info">Ver pendências</div>
        </Link>

        <Link href="/avaliar-devolucoes" className="card">
          <div className="card-titulo">Avaliar devoluções</div>
          <div className="card-info">Ver devoluções pendentes</div>
        </Link>
      </div>
    </>
  );
}
