import { supabase } from "@/lib/supabase";

export async function buscarGerentePorEmail(email: string) {
  const { data, error } = await supabase
    .from("gerente")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ? { ...data, papel: "gerente" as const } : null;
}
