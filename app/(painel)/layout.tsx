"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import "./painel.css";

export default function PainelLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    async function verificarAcesso() {
      const { data } = await supabase.auth.getSession();
      const usuarioSalvo = localStorage.getItem("usuario");

      if (!data.session || !usuarioSalvo) {
        router.replace("/login");
        return;
      }

      const usuario = JSON.parse(usuarioSalvo);

      if (usuario.papel !== "gerente") {
        router.replace("/login");
        return;
      }

      setNome(usuario.nome);
      setAutorizado(true);
    }

    verificarAcesso();
  }, [router]);

  if (!autorizado) return null;

  return (
    <div className="container">
      <Sidebar nome={nome} />
      <main className="conteudo">
        <div className="conteudo-interno">{children}</div>
      </main>
    </div>
  );
}
