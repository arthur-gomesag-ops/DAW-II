"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import "./sementes.css";

type Semente = {
  id_semente: number | string;
  tipo: string;
  subtipo: string;
  quantidade: number | string;
};

const formVazio = { tipo: "", subtipo: "", quantidade: "" };

type Campo = keyof typeof formVazio;

// escapa % e _ para o ilike comparar o texto exato
function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, "\\$&");
}

async function buscarSementes(): Promise<Semente[]> {
  const { data, error } = await supabase
    .from("semente")
    .select("*")
    .order("tipo", { ascending: true })
    .order("subtipo", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as Semente[];
}

export default function AdicionarSementesPage() {
  const [sementes, setSementes] = useState<Semente[]>([]);
  const [statusLista, setStatusLista] = useState<"carregando" | "ok" | "erro">(
    "carregando",
  );
  const [form, setForm] = useState(formVazio);
  const [editando, setEditando] = useState<number | string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });

  async function recarregar() {
    try {
      setSementes(await buscarSementes());
      setStatusLista("ok");
    } catch (erro) {
      setStatusLista("erro");
      console.error(erro);
    }
  }

  useEffect(() => {
    buscarSementes()
      .then((lista) => {
        setSementes(lista);
        setStatusLista("ok");
      })
      .catch((erro) => {
        setStatusLista("erro");
        console.error(erro);
      });
  }, []);

  function atualizar(campo: Campo) {
    return (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm({ ...form, [campo]: evento.target.value });
    };
  }

  function entrarModoEdicao(semente: Semente) {
    setEditando(semente.id_semente);
    setForm({
      tipo: semente.tipo,
      subtipo: semente.subtipo,
      quantidade: String(semente.quantidade),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function sairModoEdicao() {
    setEditando(null);
    setForm(formVazio);
  }

  async function excluirSemente(id: number | string) {
    const confirmar = confirm("Tem certeza que deseja excluir essa semente?");
    if (!confirmar) return;

    const { data, error } = await supabase
      .from("semente")
      .delete()
      .eq("id_semente", id)
      .select();

    if (error) {
      // 23503 = existem operações usando essa semente
      if (error.code === "23503") {
        alert(
          "Não é possível excluir: existem operações com essa semente. Se quiser tirá-la de circulação, edite e zere a quantidade.",
        );
      } else {
        alert(error.message || "Não foi possível excluir a semente.");
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

    const tipo = form.tipo.trim();
    const subtipo = form.subtipo.trim();
    const quantidade = form.quantidade;

    setMensagem({ texto: "", tipo: "" });

    if (!tipo || !subtipo || quantidade === "") {
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
      // evita cadastrar a mesma semente duas vezes
      let consultaDuplicada = supabase
        .from("semente")
        .select("id_semente")
        .ilike("tipo", escaparLike(tipo))
        .ilike("subtipo", escaparLike(subtipo));

      if (estaEditando) {
        consultaDuplicada = consultaDuplicada.neq("id_semente", editando);
      }

      const { data: duplicadas, error: erroDuplicada } =
        await consultaDuplicada;

      if (erroDuplicada) throw new Error(erroDuplicada.message);

      if (duplicadas && duplicadas.length > 0) {
        setMensagem({
          texto: "Essa semente já está cadastrada.",
          tipo: "erro",
        });
        return;
      }

      const valores = { tipo, subtipo, quantidade: Number(quantidade) };

      const resposta = estaEditando
        ? await supabase
            .from("semente")
            .update(valores)
            .eq("id_semente", editando)
            .select()
        : await supabase.from("semente").insert(valores).select();

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
          ? "Semente atualizada com sucesso!"
          : "Semente adicionada com sucesso!",
        tipo: "sucesso",
      });

      sairModoEdicao();
      recarregar();
    } catch (erro) {
      setMensagem({
        texto: estaEditando
          ? "Não foi possível salvar as alterações."
          : "Não foi possível adicionar a semente.",
        tipo: "erro",
      });
      console.error(erro);
    } finally {
      setEnviando(false);
    }
  }

  const estaEditando = editando !== null;

  let textoBotao = estaEditando ? "Salvar alterações" : "Adicionar semente";
  if (enviando) textoBotao = estaEditando ? "Salvando..." : "Adicionando...";

  return (
    <>
      <h1 className="sem-titulo">
        {estaEditando ? "Editar Semente" : "Adicionar Semente"}
      </h1>

      <div className="sem-card">
        <form onSubmit={handleSubmit}>
          <label htmlFor="tipo">Tipo</label>
          <select
            id="tipo"
            value={form.tipo}
            onChange={atualizar("tipo")}
            required
          >
            <option value="" disabled>
              Selecione o tipo
            </option>
            <option value="Feijão">Feijão</option>
            <option value="Fava">Fava</option>
            <option value="Outras sementes">Outras sementes</option>
          </select>

          <label htmlFor="subtipo">Subtipo</label>
          <input
            type="text"
            id="subtipo"
            value={form.subtipo}
            onChange={atualizar("subtipo")}
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

          <div className="sem-botoes">
            <button type="submit" className="sem-enviar" disabled={enviando}>
              {textoBotao}
            </button>

            {estaEditando && (
              <button
                type="button"
                className="sem-cancelar"
                onClick={sairModoEdicao}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>

        <p
          className={`sem-mensagem ${mensagem.tipo ? `sem-${mensagem.tipo}` : ""}`}
        >
          {mensagem.texto}
        </p>
      </div>

      <div className="sem-card">
        <h2 className="sem-subtitulo">Sementes cadastradas</h2>

        <table className="sem-tabela">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Subtipo</th>
              <th>Quantidade</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {statusLista === "carregando" && (
              <tr>
                <td colSpan={4}>Carregando...</td>
              </tr>
            )}

            {statusLista === "erro" && (
              <tr>
                <td colSpan={4}>Erro ao carregar sementes.</td>
              </tr>
            )}

            {statusLista === "ok" && sementes.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma semente cadastrada ainda.</td>
              </tr>
            )}

            {statusLista === "ok" &&
              sementes.map((s) => (
                <tr key={s.id_semente}>
                  <td>{s.tipo}</td>
                  <td>{s.subtipo}</td>
                  <td>
                    {s.quantidade}
                    {Number(s.quantidade) === 0 && (
                      <span className="sem-zerado">Estoque zerado</span>
                    )}
                  </td>
                  <td>
                    <div className="sem-acoes">
                      <button
                        className="sem-editar"
                        onClick={() => entrarModoEdicao(s)}
                      >
                        Editar
                      </button>
                      <button
                        className="sem-excluir"
                        onClick={() => excluirSemente(s.id_semente)}
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
