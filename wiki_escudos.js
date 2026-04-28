import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🧠 Buscar página en Wikipedia
async function searchWikipedia(team) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(team)}&format=json&origin=*`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (FootballBot/1.0)"
    }
  });

  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return data?.query?.search?.[0]?.title || null;
  } catch (e) {
    console.log("❌ Wikipedia search error:", text);
    return null;
  }
}

// 🖼️ Obtener imagen del artículo
async function getWikipediaImage(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (FootballBot/1.0)"
    }
  });

  const text = await res.text();

  try {
    const data = JSON.parse(text);

    const pages = data?.query?.pages;
    const page = pages ? Object.values(pages)[0] : null;

    return page?.thumbnail?.source || null;
  } catch (e) {
    console.log("❌ Wikipedia image error:", text);
    return null;
  }
}

// 🚀 PROCESO PRINCIPAL
async function run() {
  const { data: equipos, error } = await supabase
    .from("equipos")
    .select("id, nombre")
    .is("escudo_url", null);

  if (error) {
    console.log("❌ Supabase error:", error);
    return;
  }

  for (const equipo of equipos) {
    console.log("🔎 Buscando:", equipo.nombre);

    const title = await searchWikipedia(equipo.nombre);
    if (!title) {
      console.log("❌ Sin página:", equipo.nombre);
      continue;
    }

    const image = await getWikipediaImage(title);
    if (!image) {
      console.log("❌ Sin imagen:", equipo.nombre);
      continue;
    }

    const { error: updateError } = await supabase
      .from("equipos")
      .update({ escudo_url: image })
      .eq("id", equipo.id);

    if (updateError) {
      console.log("❌ Update error:", equipo.nombre);
    } else {
      console.log("✅ OK:", equipo.nombre);
    }
  }

  console.log("🚀 Proceso finalizado");
}

run();
