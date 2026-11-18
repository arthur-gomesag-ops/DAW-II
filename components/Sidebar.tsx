"use client";

import { MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const itensMenu = [
  { href: "/homepage", icone: "⌂", texto: "Início" },
  {
    href: "/monitorar-agricultores",
    icone: "♧",
    texto: "Monitorar agricultores",
    rotas: ["/monitorar-agricultores", "/pendencia-agricultor"],
  },
  { href: "/adicionar-sementes", icone: "▣", texto: "Gerenciar sementes" },
  { href: "/adicionar-recurso", icone: "▤", texto: "Gerenciar recursos" },
  {
    href: "/aprovar-solicitacoes",
    icone: "✓",
    texto: "Aprovar solicitações e doações",
  },
  { href: "/avaliar-devolucoes", icone: "☑", texto: "Avaliar devoluções" },
];

export default function Sidebar({ nome }: { nome: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair(evento: MouseEvent<HTMLAnchorElement>) {
    evento.preventDefault();
    await supabase.auth.signOut();
    localStorage.removeItem("usuario");
    router.push("/login");
  }

  return (
    <aside className="sidebar">
      <div className="usuario">
        <div className="avatar">👤</div>
        <span>Olá, {nome}</span>
      </div>

      <div className="pesquisa"></div>

      <nav className="menu">
        {itensMenu.map((item) => {
          const rotas = item.rotas ?? [item.href];
          const ativo = rotas.some((rota) => pathname.startsWith(rota));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={ativo ? "ativo" : ""}
            >
              <span className="icone">{item.icone}</span>
              <span>{item.texto}</span>
            </Link>
          );
        })}

        <a href="#" className="sair" onClick={sair}>
          <span className="icone">↪</span>
          <span>Sair</span>
        </a>
      </nav>
    </aside>
  );
}
