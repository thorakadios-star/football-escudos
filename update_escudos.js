import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// 🔑 conectar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 📂 leer escudos desde GitHub repo
const escudos = JSON.parse(fs.readFileSync("./escudos.json", "utf-8"));

async function run() {
  for (const equipo of escudos) {

    // 🔎 buscar equipo en Supabase
    const { data } = await supabase
      .from("equipos")
      .select("*")
      .ilike("nombre", equipo.nombre)
      .single();

    if (!data) {
      console.log("❌ No encontrado:", equipo.nombre);
      continue;
    }

    // 🖼️ actualizar escudo
    const { error } = await supabase
      .from("equipos")
      .update({ escudo_url: equipo.escudo_url })
      .eq("id", data.id);

    if (error) {
      console.log("❌ Error:", equipo.nombre);
    } else {
      console.log("✅ OK:", equipo.nombre);
    }
  }
}

run();
