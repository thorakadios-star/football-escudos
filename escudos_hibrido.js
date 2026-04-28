import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🧠 NORMALIZAR NOMBRE (CLAVE)
function formatName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/fc|cf|afc|sc/g, "")
    .trim();
}

// 🟢 1. INTENTAR DESDE GITHUB
async function getGithubLogo(team) {
  const formatted = formatName(team);

  const url = `https://raw.githubusercontent.com/luukhopman/football-logos/master/logos/${formatted}.png`;

  try {
    const res = await fetch(url);

    if (res.ok) {
      return url;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

// 🟡 2. WIKIPEDIA (FALLBACK)
async function searchWikipedia(team) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(team)}&format=json&origin=*`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (FootballBot)"
      }
    }
  );

  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return data?.query?.search?.[0]?.title || null;
  } catch {
    return null;
  }
}

async function getWikipediaImage(title) {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500&origin=*`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (FootballBot)"
      }
    }
  );

  const text = await res.text();

  try {
    const data = JSON.parse(text);
    const page = Object.values(data.query.pages)[0];
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

// 🚀 MAIN
async function run() {
  console.log("🚀 Iniciando sistema híbrido...");

  const { data: equipos } = await supabase
    .from("equipos")
    .select("id, nombre")
    .is("escudo_url", null);

  for (const equipo of equipos) {

    console.log("🔎", equipo.nombre);

    // 🟢 1. GITHUB
    const githubLogo = await getGithubLogo(equipo.nombre);

    if (githubLogo) {
      await supabase
        .from("equipos")
        .update({ escudo_url: githubLogo })
        .eq("id", equipo.id);

      console.log("✅ GitHub:", equipo.nombre);
      continue;
    }

    // 🟡 2. WIKIPEDIA
    const title = await searchWikipedia(equipo.nombre);

    if (!title) {
      console.log("❌ Sin Wikipedia:", equipo.nombre);
      continue;
    }

    const wikiLogo = await getWikipediaImage(title);

    if (!wikiLogo) {
      console.log("❌ Sin imagen:", equipo.nombre);
      continue;
    }

    await supabase
      .from("equipos")
      .update({ escudo_url: wikiLogo })
      .eq("id", equipo.id);

    console.log("🟡 Wikipedia:", equipo.nombre);
  }

  console.log("🏁 Finalizado");
}

run();
