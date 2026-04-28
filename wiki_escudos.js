import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🔎 buscar en Wikipedia
async function searchWikipedia(team) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(team)}&format=json&origin=*`
  );

  const data = await res.json();
  return data.query.search[0]?.title;
}

// 🖼️ obtener imagen
async function getWikipediaImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`
  );

  const data = await res.json();
  const pages = data.query.pages;
  const page = Object.values(pages)[0];

  return page?.thumbnail?.source || null;
}

async function run() {
  // 🟢 traer equipos sin escudo
  const { data: equipos } = await supabase
    .from("equipos")
    .select("id, nombre")
    .is("escudo_url", null);

  for (const equipo of equipos) {

    console.log("Buscando:", equipo.nombre);

    const title = await searchWikipedia(equipo.nombre);
    if (!title) continue;

    const image = await getWikipediaImage(title);
    if (!image) continue;

    const { error } = await supabase
      .from("equipos")
      .update({ escudo_url: image })
      .eq("id", equipo.id);

    if (!error) {
      console.log("✅ OK:", equipo.nombre);
    } else {
      console.log("❌ Error:", equipo.nombre);
    }
  }
}

run();
