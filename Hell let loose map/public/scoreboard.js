(function () {
  "use strict";

  // ── State ────────────────────────────────────────────────────────────────────
  let latestState = null;
  let currentMapId = null;
  let mapsById = {};          // populated from /api/maps on startup
  let isOpen = false;

  // ── DOM refs ─────────────────────────────────────────────────────────────────
  const overlay   = document.getElementById("scoreboard");
  const elMapName = document.getElementById("sb-map-name");
  const elSectors = document.getElementById("sb-sectors");
  const elAlliesN = document.getElementById("sb-allies-count");
  const elAxisN   = document.getElementById("sb-axis-count");
  const elAllies  = document.getElementById("sb-allies-list");
  const elAxis    = document.getElementById("sb-axis-list");

  // ── Preload maps list so we can resolve mapId → display name ourselves ───────
  fetch("/api/maps")
    .then(r => r.json())
    .then(list => {
      if (!Array.isArray(list)) return;
      list.forEach(m => {
        if (m.id) mapsById[m.id] = m.name || m.id;
        (m.aliases || []).forEach(a => { mapsById[a] = m.name || m.id; });
      });
    })
    .catch(() => {});

  function resolveMapName(mapId) {
    if (!mapId) return "";
    return mapsById[mapId] || mapId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  // ── Open / close ─────────────────────────────────────────────────────────────
  function open() {
    if (isOpen) return;
    isOpen = true;
    renderAll();
    overlay.classList.add("is-open");
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.remove("is-open");
  }

  // Hold Tab to show, release to hide (skip if user is in an input)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    e.preventDefault();
    open();
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "Tab") close();
  });

  // Click the dark backdrop to close
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  // ── Data intake ───────────────────────────────────────────────────────────────
  window.addEventListener("liveStateUpdate", (e) => {
    latestState = e.detail;
    if (latestState?.mapId) currentMapId = latestState.mapId;
    if (isOpen) renderAll();
  });

  // Backup: app.js can still push the display name directly
  window.setScoreboardMapName = function (name) {
    if (!name || name === "undefined" || name === "null") return;
    elMapName.textContent = name;
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  function renderAll() {
    const displayName = resolveMapName(currentMapId);
    elMapName.textContent = displayName || "—";

    if (!latestState) return;

    const players = latestState.players || [];
    const score   = latestState.score   || { allied: 0, axis: 0 };
    const counts  = latestState.playerCounts || {};

    const allies = players.filter(p => isAllied(p.team));
    const axis   = players.filter(p => isAxis(p.team));

    elAlliesN.textContent = num(counts.allied, allies.length);
    elAxisN.textContent   = num(counts.axis,   axis.length);

    renderSectors(score);
    renderList(elAllies, allies, "allies");
    renderList(elAxis,   axis,   "axis");
  }

  function renderSectors(score) {
    const allied = Math.min(5, Math.max(0, Number(score.allied) || 0));
    const axis   = Math.min(5, Math.max(0, Number(score.axis)   || 0));
    elSectors.innerHTML = Array.from({ length: 5 }, (_, i) => {
      let cls = "sb-pip";
      if (i < allied)         cls += " sb-pip--allies";
      else if (i >= 5 - axis) cls += " sb-pip--axis";
      else                    cls += " sb-pip--neutral";
      return `<div class="${cls}"></div>`;
    }).join("");
  }

  function renderList(container, players, team) {
    const sorted = [...players].sort((a, b) => {
      const ra = roleOrder(a.role), rb = roleOrder(b.role);
      const aCmd = ra === 0, bCmd = rb === 0;
      if (aCmd !== bCmd) return aCmd ? -1 : 1;
      return (Number(b.combat) || 0) - (Number(a.combat) || 0);
    });

    container.innerHTML = "";
    for (const p of sorted) {
      const row = document.createElement("div");
      row.className = "sb-row sb-row--" + team;

      const squadLabel = p.squad ? capitalize(p.squad) : "";
      const isLeader   = isLeaderRole(p.role);
      const kills      = Number(p.kills)   || 0;
      const deaths     = Number(p.deaths)  || 0;
      const kd = deaths > 0 ? (kills / deaths).toFixed(1) : kills > 0 ? "∞" : "0.0";

      row.innerHTML =
        `<span class="sb-row__name${isLeader ? " sb-row__name--leader" : ""}">${esc(p.name || "—")}</span>` +
        `<span class="sb-row__stat">${kills}</span>` +
        `<span class="sb-row__stat">${deaths}</span>` +
        `<span class="sb-row__stat sb-row__stat--kd">${kd}</span>` +
        `<span class="sb-row__stat">${Number(p.combat)  || 0}</span>` +
        `<span class="sb-row__stat">${Number(p.offense) || 0}</span>` +
        `<span class="sb-row__stat">${Number(p.defense) || 0}</span>` +
        `<span class="sb-row__stat">${Number(p.support) || 0}</span>` +
        `<span class="sb-row__squad">${esc(squadLabel)}</span>`;

      row.title = `${p.name || "Unknown"} — click to manage`;
      row.addEventListener("click", () => {
        close();
        window.dispatchEvent(new CustomEvent("playerSelect", { detail: p }));
      });
      container.appendChild(row);
    }

    if (sorted.length === 0) {
      container.innerHTML = `<div class="sb-empty">No players</div>`;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function num(primary, fallback) {
    const v = Number(primary);
    return Number.isFinite(v) ? v : (Number(fallback) || 0);
  }

  function isAllied(team) {
    const t = (team || "").toLowerCase();
    return t === "allies" || t === "allied" || t === "us" || t === "brit" || t === "soviet";
  }

  function isAxis(team) {
    const t = (team || "").toLowerCase();
    return t === "axis" || t === "german" || t === "ger";
  }

  function roleOrder(role) {
    const r = (role || "").toLowerCase().replace(/[^a-z]/g, "");
    if (r === "armycommander" || r === "commander") return 0;
    if (r === "officer" || r === "squadleader" || r === "platoonleader") return 1;
    if (r === "tankcommander" || r === "crewcommander") return 2;
    if (r === "spotter") return 3;
    return 10;
  }

  function isLeaderRole(role) {
    const r = (role || "").toLowerCase().replace(/[^a-z]/g, "");
    return r === "armycommander" || r === "commander" ||
           r === "officer"       || r === "squadleader" ||
           r === "platoonleader" || r === "tankcommander" ||
           r === "crewcommander" || r === "spotter";
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
