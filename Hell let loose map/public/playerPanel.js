(function () {
  "use strict";

  // ── DOM ─────────────────────────────────────────────────────────────────────
  const panel    = document.getElementById("player-panel");
  const btnClose = document.getElementById("pp-close");
  const elName   = document.getElementById("pp-name");
  const elMeta   = document.getElementById("pp-meta");
  const elId     = document.getElementById("pp-id");
  const inMsg    = document.getElementById("pp-message");
  const inReason = document.getElementById("pp-reason");
  const elStatus = document.getElementById("pp-status");

  let current = null; // currently selected player object

  // ── Open / close ────────────────────────────────────────────────────────────
  function openPanel(player) {
    current = player;

    const team  = capitalize(player.team  || "unknown");
    const role  = formatRole(player.role  || "");
    const squad = player.squad ? capitalize(player.squad) + " squad" : "";

    elName.textContent = player.name || "Unknown";
    elMeta.textContent = [team, role, squad].filter(Boolean).join("  ·  ");
    elId.textContent   = player.id || "";

    inMsg.value    = "";
    inReason.value = "";
    clearStatus();

    panel.classList.add("is-open");
  }

  function closePanel() {
    panel.classList.remove("is-open");
    current = null;
    clearStatus();
  }

  btnClose.addEventListener("click", closePanel);

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
  });

  // ── Player select event from liveMap ────────────────────────────────────────
  window.addEventListener("playerSelect", (e) => openPanel(e.detail));

  // ── Actions ─────────────────────────────────────────────────────────────────
  panel.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || !current) return;

    const action = btn.dataset.action;
    const hours  = btn.dataset.hours ? Number(btn.dataset.hours) : undefined;

    // Confirm destructive actions
    const dangerous = ["kick", "temp_ban", "perma_ban"];
    if (dangerous.includes(action)) {
      const label = btn.textContent.trim();
      if (!confirm(`Are you sure you want to ${label} ${current.name}?`)) return;
    }

    const payload = {
      action,
      player_id:   current.id,
      player_name: current.name,
      reason:      inReason.value.trim() || undefined,
      message:     action === "message" ? (inMsg.value.trim() || undefined) : undefined,
      duration_hours: hours
    };

    setStatus("loading", "Sending…");
    btn.disabled = true;

    try {
      const res  = await fetch("/api/admin/player-action", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok) {
        setStatus("ok", actionLabel(action, hours) + " sent");
        inMsg.value    = "";
        inReason.value = "";
      } else {
        setStatus("err", data.error || "CRCON returned an error");
      }
    } catch (err) {
      setStatus("err", err.message || "Network error");
    } finally {
      btn.disabled = false;
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function setStatus(type, text) {
    elStatus.className = "pp-status pp-status--" + type;
    elStatus.textContent = text;
  }

  function clearStatus() {
    elStatus.className  = "pp-status";
    elStatus.textContent = "";
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
  }

  function formatRole(role) {
    return role
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function actionLabel(action, hours) {
    switch (action) {
      case "message":    return "Message";
      case "punish":     return "Punish";
      case "kick":       return "Kick";
      case "switch_team":return "Team switch";
      case "watch":      return "Watch";
      case "temp_ban":   return `Temp ban (${hours}h)`;
      case "perma_ban":  return "Permanent ban";
      default:           return action;
    }
  }
})();
