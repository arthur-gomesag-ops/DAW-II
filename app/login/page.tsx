"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { buscarGerentePorEmail } from "@/lib/gerente";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const emailLimpo = email.trim();
    setMensagem("");

    if (!emailLimpo || !senha) {
      setMensagem("Digite o email e a senha.");
      return;
    }

    setCarregando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      });

      if (error || !data.user) {
        setMensagem("Email ou senha incorretos.");
        return;
      }

      const usuario = await buscarGerentePorEmail(data.user.email!);

      if (!usuario) {
        await supabase.auth.signOut();
        setMensagem("Essa conta não é de gerente.");
        return;
      }

      localStorage.setItem("usuario", JSON.stringify(usuario));
      router.push("/homepage");
    } catch (erro) {
      setMensagem("Não foi possível entrar. Tente novamente.");
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="container-login">
      <div className="lado-esquerdo">
        <Image
          src="/imagens/logo.png"
          alt="Logo TRSS"
          width={190}
          height={190}
          priority
        />
        <h1>Seja bem vindo!</h1>
      </div>

      <div className="caixa-login">
        <h2>Faça seu login como gerente!</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <div className="email-container">
            <input
              type="email"
              id="email"
              placeholder="Digite seu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label htmlFor="senha">Senha</label>
          <div className="senha-container">
            <input
              type="password"
              id="senha"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="acessar" disabled={carregando}>
            {carregando ? "Entrando..." : "Acessar"}
          </button>
        </form>

        <p id="mensagem" className="erro">
          {mensagem}
        </p>

        <p className="cadastro">
          Não tem uma conta?
          <Link href="/cadastro"> Registre-se aqui! </Link>
        </p>
      </div>
    </div>
  );
}
