import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 🧠 ALIAS (CLAVE DEL SISTEMA)
const aliases = {
  "Nacional": "cd-nacional",
  "Marítimo": "cs-maritimo",
  "Paços de Ferreira": "pacos-de-ferreira",
  "Tondela": "cd-tondela"
};

// 🧠 NORMALIZAR NOMBRE
function formatName(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/fc|cf|sc|cd|cs/g, "")
    .trim();
}

// 🟢 GITHUB
async function getGithubLogo(team) {
  let formatted = aliases[team] || formatName(team);

  const url = `https://raw.githubusercontent.com/luukhopman/football-logos/master/logos/${formatted}.png`;

  try {
    const res = await fetch(url);
    return res.ok ? url : null;
  } catch {
    return null;
  }
}

// 🟡 WIKIPEDIA (MEJORADA)
async function searchWikipedia(team) {
  const queries = [
    `${team} football club`,
    `${team} soccer club`
  ];

  for (const q of queries) {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (FootballBot)"
        }
      }
    );

    const text = await res.text();

    try {
      const data = JSON.parse(text);
      const title = data?.query?.search?.[0]?.title;

      if (title) return title;
    } catch {}
  }

  return null;
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
  console.log("🚀 Sistema híbrido PRO iniciado");

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
