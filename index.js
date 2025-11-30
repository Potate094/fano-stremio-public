// index.js
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const builder = new addonBuilder({
  id: "lv.raitino90.fano.personal",
  version: "2.2.1",
  name: "Fano.in Personal (by Raitino90)",
  description: "Ievadi savu fano.in kontu vienreiz – strādā 24/7 un mūžīgi",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  }
});

builder.defineConfigHandler((args) => {
  const hasUser = args.config?.username;
  return {
    type: "object",
    properties: {
      username: {
        type: "string",
        title: hasUser ? `Pieslēgts kā: ${args.config.username} Checkmark` : "Fano.in lietotājvārds",
        default: hasUser ? args.config.username : ""
      },
      password: {
        type: "string",
        title: "Fano.in parole",
        format: "password"
      }
    },
    required: ["username", "password"]
  };
});

builder.defineStreamHandler(async (args) => {
  if (!args.config?.username || !args.config?.password) return { streams: [] };

  const { username, password } = args.config;
  const imdb = args.id.split(":")[0];

  let cookie = "";
  try {
    const login = await axios.post("https://fano.in/login.php",
      new URLSearchParams({ username, password }),
      { maxRedirects: 0, validateStatus: () => true }
    );

    const cookies = login.headers["set-cookie"];
    if (cookies) cookie = cookies.map(c => c.split(";")[0]).join("; ");
    else return { streams: [] };
  } catch { return { streams: [] }; }

  try {
    const search = await axios.get(`https://fano.in/search.php?search=${imdb}`, {
      headers: { cookie, "User-Agent": "Mozilla/5.0" }
    });

    const match = search.data.match(/href="(torrent\/[^"]*?tt\d{7,8}[^"]*)"/i);
    if (!match) return { streams: [] };

    const page = await axios.get("https://fano.in/" + match[1], {
      headers: { cookie, "User-Agent": "Mozilla/5.0" }
    });

    const magnet = page.data.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/);
    if (magnet) {
      return { streams: [{ url: magnet[1], title: `Fano.in – ${username}` }] };
    }
  } catch (e) {
    console.log("Stream error:", e.message);
  }

  return { streams: [] };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
