"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import "./recursos.css";

type Recurso = {
  id_recurso: number | string;
  nome_recurso: string;
  quantidade: number | string;
};

const formVazio = { nome_recurso: "", quantidade: "" };

type Campo = keyof typeof formVazio;

// escapa % e _ para o ilike comparar o texto exato
function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, "\\$&");
}

async function buscarRecursos(): Promise<Recurso[]> {
  const { data, error } = await supabase
    .from("recurso")
    .select("*")
    .order("nome_recurso", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as Recurso[];
}

export default function AdicionarRecursoPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [statusLista, setStatusLista] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState<number | string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  async function recarregar() {
    try {
      setRecursos(await buscarRecursos());
      setStatusLista("ok");
    } catch (erro) {
      setStatusLista("erro");
      console.error(erro);
    }
  }

  useEffect(() => {
    buscarRecursos()
      .then((lista) => {
        setRecursos(lista);
        setStatusLista("ok");
      })
      .catch((erro) => {
        setStatusLista("erro");
        console.error(erro);
      });
  }, []);

  function atualizar(campo: Campo) {
    return (evento: ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [campo]: evento.target.value });
    };
  }

  function entrarModoEdicao(recurso: Recurso) {
    setEditando(recurso.id_recurso);
    setForm({
      nome_recurso: recurso.nome_recurso,
      quantidade: String(recurso.quantidade),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sairModoEdicao() {
    setEditando(null);
    setForm(formVazio);
  }

  async function excluirRecurso(id: number | string) {
    const confirmar = confirm("Tem certeza que deseja excluir esse recurso?");
    if (!confirmar) return;

    const { data, error } = await supabase
      .from("recurso")
      .delete()
      .eq("id_recurso", id)
      .select();

    if (error) {
      // 23503 = existem operações usando esse recurso
      if (error.code === "23503") {
        alert(
          "Não é possível excluir: existem operações com esse recurso. Se quiser tirá-lo de circulação, edite e zere a quantidade.",
        );
      } else {
        alert(error.message || "Não foi possível excluir o recurso.");
      }
      return;
    }

    if (!data || data.length === 0) {
      alert("Nada foi excluído. Verifique suas permissões.");
      return;
    }

    if (editando !== null && String(editando) === String(id)) {
      sairModoEdicao();
    }

    recarregar();
  }

  // adicionar ou salvar edição
  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const nome_recurso = form.nome_recurso.trim();
    const quantidade = form.quantidade;

    setMensagem({ texto: "", tipo: "" });

    if (!nome_recurso || quantidade === "") {
      setMensagem({ texto: "Preencha todos os campos.", tipo: "erro" });
      return;
    }

    if (Number(quantidade) < 0) {
      setMensagem({
        texto: "A quantidade não pode ser negativa.",
        tipo: "erro",
      });
      return;
    }

    const estaEditando = editando !== null;

    setEnviando(true);

    try {
      // evita cadastrar o mesmo recurso duas vezes
      let consultaDuplicada = supabase
        .from("recurso")
        .select("id_recurso")
        .ilike("nome_recurso", escaparLike(nome_recurso));

      if (estaEditando) {
        consultaDuplicada = consultaDuplicada.neq("id_recurso", editando);
      }

      const { data: duplicados, error: erroDuplicado } =
        await consultaDuplicada;

      if (erroDuplicado) throw new Error(erroDuplicado.message);

      if (duplicados && duplicados.length > 0) {
        setMensagem({
          texto: "Esse recurso já está cadastrado.",
          tipo: "erro",
        });
        return;
      }

      const valores = { nome_recurso, quantidade: Number(quantidade) };

      const resposta = estaEditando
        ? await supabase
            .from("recurso")
            .update(valores)
            .eq("id_recurso", editando)
            .select()
        : await supabase.from("recurso").insert(valores).select();

      if (resposta.error) throw new Error(resposta.error.message);

      if (!resposta.data || resposta.data.length === 0) {
        setMensagem({
          texto: "Nada foi salvo. Verifique suas permissões.",
          tipo: "erro",
        });
        return;
      }

      setMensagem({
        texto: estaEditando
          ? "Recurso atualizado com sucesso!"
          : "Recurso adicionado com sucesso!",
        tipo: "sucesso",
      });

      sairModoEdicao();
      recarregar();
    } catch (erro) {
      setMensagem({
        texto: estaEditando
          ? "Não foi possível salvar as alterações."
          : "Não foi possível adicionar o recurso.",
        tipo: "erro",
      });
      console.error(erro);
    } finally {
      setEnviando(false);
    }
  }

  const estaEditando = editando !== null;

  let textoBotao = estaEditando ? "Salvar alterações" : "Adicionar recurso";
  if (enviando) textoBotao = estaEditando ? "Salvando..." : "Adicionando...";

  return (
    <>
      <h1 className="rec-titulo">
        {estaEditando ? "Editar Recurso" : "Adicionar Recurso"}
      </h1>

      <div className="rec-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="nome_recurso">Nome do recurso</label>
          <input
            type="text"
            id="nome_recurso"
            value={form.nome_recurso}
            onChange={atualizar("nome_recurso")}
            required
          />

          <label htmlFor="quantidade">Quantidade</label>
          <input
            type="number"
            id="quantidade"
            min="0"
            step="any"
            value={form.quantidade}
            onChange={atualizar("quantidade")}
            required
          />

          <div className="rec-botoes">
            <button type="submit" className="rec-enviar" disabled={enviando}>
              {textoBotao}
            </button>

            {estaEditando && (
              <button
                type="button"
                className="rec-cancelar"
                onClick={sairModoEdicao}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <p
          className={`rec-mensagem ${mensagem.tipo ? `rec-${mensagem.tipo}` : ""}`}
        >
          {mensagem.texto}
        </p>
      </div>

      <div className="rec-card">
        <h2 className="rec-subtitulo">Recursos cadastrados</h2>

        <table className="rec-tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {statusLista === "carregando" && (
              <tr>
                <td colSpan={3}>Carregando...</td>
              </tr>
            )}

            {statusLista === "erro" && (
              <tr>
                <td colSpan={3}>Erro ao carregar recursos.</td>
              </tr>
            )}

            {statusLista === "ok" && recursos.length === 0 && (
              <tr>
                <td colSpan={3}>Nenhum recurso cadastrado ainda.</td>
              </tr>
            )}

            {statusLista === "ok" &&
              recursos.map((r) => (
                <tr key={r.id_recurso}>
                  <td>{r.nome_recurso}</td>
                  <td>
                    {r.quantidade}
                    {Number(r.quantidade) === 0 && (
                      <span className="rec-zerado">Estoque zerado</span>
                    )}
                  </td>
                  <td>
                    <div className="rec-acoes">
                      <button
                        className="rec-editar"
                        onClick={() => entrarModoEdicao(r)}
                      >
                        Editar
                      </button>
                      <button
                        className="rec-excluir"
                        onClick={() => excluirRecurso(r.id_recurso)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
