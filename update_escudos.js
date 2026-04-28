import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const escudos = JSON.parse(fs.readFileSync("./escudos.json", "utf-8"));

async function run() {
  for (const equipo of escudos) {

    const { data } = await supabase
      .from("equipos")
      .select("*")
      .ilike("nombre", equipo.nombre)
      .single();

    if (!data) {
      console.log("❌ No encontrado:", equipo.nombre);
      continue;
    }

    await supabase
      .from("equipos")
      .update({ escudo_url: equipo.escudo_url })
      .eq("id", data.id);

    console.log("✅ OK:", equipo.nombre);
  }
}

run();
