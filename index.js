// index.js
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const builder = new addonBuilder({
  id: "lv.raitino90.fano.personal",
  version: "2.2.0",
  name: "Fano.in Personal (by Raitino90)",
  description: "Ievadi SAVU fano.in kontu vienreiz – strādā mūžīgi un 24/7",
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"],
  behaviorHints: {
    configurable: true,
    configurationRequired: true
  }
});

// Skaists config ekrāns – atceras mūžīgi
builder.defineConfigHandler((args) => {
  const hasConfig = args.config && args.config.username;
  return {
    type: "object",
    properties: {
      username: {
        type: "string",
        title: hasConfig ? `Pieslēgts kā: ${args.config.username} Checkmark` : "Fano.in lietotājvārds",
        default: hasConfig ? args.config.username : ""
      },
      password: {
        type: "string",
        title: "Fano.in parole",
        format: "password",
        default: ""
      }
    },
    required: ["username", "password"]
  };
});

// Stream handler – viss strādā 2025. gada novembrī
builder.defineStreamHandler(async (args) => {
  if (!args.config?.username || !args.config?.password) return { streams: [] };

  const { username, password } = args.config;
  const imdb = args.id.split(":")[0];

  let cookie = "";
  try {
    const login = await axios.post("https://fano.in/login.php",
      new URLSearchParams({ username, password }),
      { maxRedirects: 0, validateStatus: null }
    );
    if (login.headers["set-cookie"]) {
      cookie = login.headers["set-cookie"].map(c => c.split(";")[0]).join("; ");
    } else return { streams: [] };
  } catch { return { streams: [] }; }

  try {
    const search = await axios.get(`https://fano.in/search.php?search=${imdb}`, {
      headers: { cookie, "User-Agent": "Mozilla/5.0" }
    });

    const linkMatch = search.data.match(new RegExp(`href="(torrent/${imdb}[^"]*)"`));
    if (!linkMatch) return { streams: [] };

    const torrentPage = await axios.get("https://fano.in/" + linkMatch[1], {
      headers: { cookie, "User-Agent": "Mozilla/5.0" }
    });

    const magnet = torrentPage.data.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/);
    if (magnet) {
      return {
        streams: [{
          url: magnet[1],
          title: `Fano.in – ${username}`
        }]
      };
    }
  } catch (e) {
    console.log("Error:", e.message);
  }

  return { streams: [] };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
