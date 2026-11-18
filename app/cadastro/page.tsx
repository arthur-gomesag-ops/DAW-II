"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import "./cadastro.css";

const formVazio = {
  nome: "",
  telefone: "",
  cpf: "",
  email: "",
  senha: "",
  confirmarSenha: "",
};

type Campo = keyof typeof formVazio;

function traduzirErro(codigo?: string) {
  switch (codigo) {
    case "user_already_exists":
    case "email_exists":
      return "Este email já está cadastrado.";
    case "weak_password":
      return "Senha muito fraca. Use uma senha mais forte.";
    case "email_address_invalid":
      return "Email inválido.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitas tentativas. Aguarde um pouco e tente de novo.";
    case "signup_disabled":
      return "Os cadastros estão desativados no momento.";
    default:
      return "Não foi possível realizar o cadastro.";
  }
}

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState(formVazio);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  function atualizar(campo: Campo) {
    return (evento: ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [campo]: evento.target.value });
    };
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem({ texto: "", tipo: "" });

    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const cpf = form.cpf.trim();
    const email = form.email.trim();
    const { senha, confirmarSenha } = form;

    if (!nome || !telefone || !cpf || !email || !senha || !confirmarSenha) {
      setMensagem({ texto: "Preencha todos os campos.", tipo: "erro" });
      return;
    }

    if (senha !== confirmarSenha) {
      setMensagem({ texto: "As senhas não são iguais.", tipo: "erro" });
      return;
    }

    if (senha.length < 6) {
      setMensagem({
        texto: "A senha precisa ter pelo menos 6 caracteres.",
        tipo: "erro",
      });
      return;
    }

    setCarregando(true);

    try {
      // mesmo formato usado no cadastro do app mobile
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            telefone: telefone.replace(/\D/g, ""), // só números
            cpf,
            papel: "gerente",
          },
        },
      });

      if (error) {
        setMensagem({ texto: traduzirErro(error.code), tipo: "erro" });
        return;
      }

      // Supabase devolve usuário sem identidades quando o email já existe
      if (data.user && data.user.identities?.length === 0) {
        setMensagem({ texto: "Este email já está cadastrado.", tipo: "erro" });
        return;
      }

      setMensagem({
        texto: "Cadastro realizado! Verifique seu email e faça login.",
        tipo: "sucesso",
      });
      setForm(formVazio);

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (erro) {
      setMensagem({
        texto: "Não foi possível realizar o cadastro.",
        tipo: "erro",
      });
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="cad-container">
      <div className="cad-lado-esquerdo">
        <Image
          src="/imagens/logo.png"
          alt="Logo TRSS"
          width={190}
          height={190}
          priority
        />
        <h1>Seja bem vindo!</h1>
      </div>

      <div className="cad-caixa">
        <h2>Cadastre-se como gerente!</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="nome">Nome completo</label>
          <div className="cad-campo">
            <input
              type="text"
              id="nome"
              placeholder="Digite seu nome"
              value={form.nome}
              onChange={atualizar("nome")}
              required
            />
          </div>

          <label htmlFor="telefone">Telefone</label>
          <div className="cad-campo">
            <input
              type="tel"
              id="telefone"
              placeholder="Digite seu telefone"
              value={form.telefone}
              onChange={atualizar("telefone")}
              required
            />
          </div>

          <label htmlFor="cpf">CPF</label>
          <div className="cad-campo">
            <input
              type="text"
              id="cpf"
              placeholder="Digite seu CPF"
              value={form.cpf}
              onChange={atualizar("cpf")}
              required
            />
          </div>

          <label htmlFor="email">Email</label>
          <div className="cad-campo">
            <input
              type="email"
              id="email"
              placeholder="Digite seu email"
              value={form.email}
              onChange={atualizar("email")}
              required
            />
          </div>

          <label htmlFor="senha">Senha</label>
          <div className="cad-campo">
            <input
              type="password"
              id="senha"
              placeholder="Digite sua senha"
              value={form.senha}
              onChange={atualizar("senha")}
              required
            />
          </div>

          <label htmlFor="confirmarSenha">Confirmar senha</label>
          <div className="cad-campo">
            <input
              type="password"
              id="confirmarSenha"
              placeholder="Digite a senha novamente"
              value={form.confirmarSenha}
              onChange={atualizar("confirmarSenha")}
              required
            />
          </div>

          <button type="submit" className="cad-botao" disabled={carregando}>
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className={`cad-mensagem ${mensagem.tipo}`}>{mensagem.texto}</p>

        <p className="cad-rodape">
          Já tem uma conta?
          <Link href="/login"> Faça login aqui! </Link>
        </p>
      </div>
    </div>
  );
}
