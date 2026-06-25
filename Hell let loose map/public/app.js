const socket = io();

/* =========================
   STATE
========================= */
let mode = null;
let activeSquad = 1;

let objects = {};

function modeLabel(m) {
  if (m === "route") return "Move line";
  return markerLabel(m);
}

let drawing = false;
let start = null;
let tempOutline = null;
let temp = null;
let tempArrow = null;
let drawArrowAngleDeg = 0;
let drawArrowAdjusted = false;
let handleDrag = null;
let skipNextClick = false;
let wheelRouteSaveTimer = null;

const ROUTE_ROTATE_STEP_DEG = 8;

const PHONETIC = [
  "Able", "Baker", "Charlie", "Dog", "Easy", "Fox", "George", "How",
  "Item", "Jig", "King", "Love", "Mike", "Nan", "Oboe", "Peter",
  "Queen", "Roger", "Sugar", "Tare", "Uncle", "Victor", "William",
  "X-ray", "Yoke", "Zulu"
];

const SQUADS = PHONETIC.map((label, i) => ({
  id: i + 1,
  label,
  color: squadPaletteColor(i, PHONETIC.length)
}));

function squadPaletteColor(index, total) {
  const hue = Math.round((index * 360) / total);
  return `hsl(${hue}, 78%, 52%)`;
}

const ROUTE_COLOR = "#00ff00";

const ROUTE_OUTLINE_STYLE = {
  color: "#101510",
  weight: 6,
  opacity: 0.86,
  interactive: false,
  lineCap: "round",
  lineJoin: "round",
  className: "route-line-outline"
};

const ROUTE_LINE_STYLE = {
  color: ROUTE_COLOR,
  weight: 3,
  opacity: 0.95,
  interactive: false,
  lineCap: "round",
  lineJoin: "round",
  className: "route-line"
};

/* =========================
   MAP
========================= */
const map = L.map("map", {
  crs: L.CRS.Simple,
  doubleClickZoom: false,
  zoomControl: false,
  attributionControl: false
});

L.control.zoom({ position: "bottomright" }).addTo(map);

const bounds = [[0, 0], [1000, 1000]];
let mapOverlay = null;
let currentMapId = null;
const overlayCache = new Map();

function setMapImage(imageUrl, mapId) {
  if (mapId && mapId === currentMapId && mapOverlay) return;

  if (mapOverlay) {
    map.removeLayer(mapOverlay);
    mapOverlay = null;
  }

  const cacheKey = mapId || imageUrl;
  let overlay = overlayCache.get(cacheKey);
  if (!overlay) {
    overlay = L.imageOverlay(imageUrl, bounds);
    overlayCache.set(cacheKey, overlay);
  }

  if (mapId) currentMapId = mapId;
  mapOverlay = overlay;
  overlay.addTo(map);

  if (!map._hllFitted) {
    map.fitBounds(bounds, { padding: [24, 24] });
    map._hllFitted = true;
  }

  requestAnimationFrame(positionLegendPanel);
}

function updateCurrentMapDisplay(state) {
  const el = document.getElementById("currentMapName");
  if (!el) return;

  const mapName = state?.currentMap?.name;
  const rcon = state?.rcon;

  if (mapName) {
    el.textContent = mapName;
    el.classList.remove("is-waiting");
    if (typeof window.setScoreboardMapName === "function") window.setScoreboardMapName(mapName);
    return;
  }

  el.classList.add("is-waiting");
  if (!rcon?.configured) {
    el.textContent = "CRCON not configured";
  } else if (rcon.error && !rcon.connected) {
    el.textContent = "CRCON error";
    el.title = rcon.error;
  } else if (!rcon.connected) {
    el.textContent = "Connecting to CRCON…";
    el.title = "";
  } else if (rcon.lastMapName) {
    el.textContent = `Unknown map: ${rcon.lastMapName}`;
    el.title = "Add this map name to hllMaps.js";
  } else {
    el.textContent = "Waiting for live map…";
    el.title = "";
  }
}

window.addEventListener("resize", () => map.invalidateSize());
setTimeout(() => map.invalidateSize(), 0);

document.addEventListener("contextmenu", (e) => e.preventDefault());

initSquadBar();
initLegend();
initShortcutsDropdown();
initRouteScrollRotate();

/* =========================
   SHORTCUTS DROPDOWN
========================= */
function initShortcutsDropdown() {
  const toggle = document.getElementById("shortcutsToggle");
  const menu = document.getElementById("shortcutsMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("is-open");
      menu.setAttribute("aria-hidden", "true");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

/* =========================
   SQUAD BAR
========================= */
function initSquadBar() {
  const bar = document.getElementById("squadBar");
  if (!bar) return;

  bar.innerHTML = SQUADS.map((s) => {
    const active = s.id === activeSquad;
    return `<button type="button" class="squad-btn${active ? " active" : ""}" data-squad="${s.id}" title="${s.label}">${s.label}</button>`;
  }).join("");

  bar.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-squad]");
    if (!btn) return;
    activeSquad = Number(btn.dataset.squad);
    bar.querySelectorAll(".squad-btn").forEach((b) => {
      b.classList.toggle("active", Number(b.dataset.squad) === activeSquad);
    });
  });
}

function squadColor(squadId) {
  return SQUADS.find((s) => s.id === squadId)?.color || "#3b82f6";
}

function squadLabel(squadId) {
  return SQUADS.find((s) => s.id === squadId)?.label || "Able";
}

/* =========================
   LEGEND
========================= */
function initLegend() {
  const markersEl = document.getElementById("legendMarkers");
  const moveEl = document.getElementById("legendMove");
  const panel = document.getElementById("legend");
  if (!markersEl || !moveEl || !panel) return;

  map.getContainer().appendChild(panel);

  markersEl.innerHTML = MARKER_CATEGORIES.map(
    (cat) => `
    <li class="legend-category">
      <span class="legend-category__title">${cat.label}</span>
      <ul class="legend-list legend-list--nested">
        ${cat.items
          .map(
            (item) => `
        <li>
          ${markerLegendPreview(item.type)}
          <span>${item.label} — ${item.desc}</span>
        </li>`
          )
          .join("")}
      </ul>
    </li>`
  ).join("");

  moveEl.innerHTML = `
    <li>
      <span class="legend-sample legend-sample--line"></span>
      <span>Move path (Squad-style green route)</span>
    </li>
    <li>
      <div class="legend-sample legend-sample--move" aria-hidden="true">
        ${routeArrowSvg(null, "route-arrow--legend")}
      </div>
      <span>Arrow follows path direction</span>
    </li>`;

  function toggleLegend() {
    const open = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) requestAnimationFrame(positionLegendPanel);
  }

  // Keyboard shortcut: X key to toggle legend
  document.addEventListener("keydown", (e) => {
    if ((e.key === "x" || e.key === "X") && !isInputField(e.target)) {
      e.preventDefault();
      toggleLegend();
    }
  });

  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);

  map.whenReady(() => {
    positionLegendPanel();
    map.on("move zoom resize viewreset", positionLegendPanel);
  });
}

function isInputField(el) {
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

function positionLegendPanel() {
  const panel = document.getElementById("legend");
  if (!panel || !map || !map._loaded) return;

  const inset = 10;
  const mapEl = map.getContainer();
  const imageEl = mapEl.querySelector(".leaflet-image-layer");
  if (!imageEl) return;

  const mapRect = mapEl.getBoundingClientRect();
  const imageRect = imageEl.getBoundingClientRect();
  const left = Math.max(inset, imageRect.left - mapRect.left + inset);
  const bottom = Math.max(inset, mapRect.bottom - imageRect.bottom + inset);
  const maxWidth = Math.max(220, imageRect.width - inset * 2);

  panel.style.maxWidth = `${maxWidth}px`;
  panel.style.left = `${left}px`;
  panel.style.bottom = `${bottom}px`;
  panel.style.top = "auto";
  panel.style.transform = "none";
}

function markerLegendPreview(type) {
  const key = normalizeMarkerType(type);
  const sampleColor =
    MARKER_TYPES[key]?.category === "spots" || key === "ping" ? HLL_MARKER_RED : "#00ff00";
  return `<div class="legend-sample legend-sample--marker" aria-hidden="true">${markerHtml(key, "", sampleColor, true)}</div>`;
}

function createTacticalMarker(latlng, markerType, squadId) {
  const type = normalizeMarkerType(markerType);
  const neutral = isNeutralMarker(type);
  const html = markerHtml(
    type,
    neutral ? "" : squadLabel(squadId),
    neutral ? HLL_MARKER_RED : squadColor(squadId)
  );
  const layout = markerIconLayout(type);

  const icon = L.divIcon({
    className: "hll-marker-wrap",
    html,
    iconSize: layout.iconSize,
    iconAnchor: layout.iconAnchor
  });

  return L.marker(latlng, { icon, interactive: true });
}

function lineAngleDeg(from, to) {
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

function routeMidpoint(points) {
  const start = pairToLatLng(points[0]);
  const end = pairToLatLng(points[points.length - 1]);
  return L.latLng((start.lat + end.lat) / 2, (start.lng + end.lng) / 2);
}

function createMoveSquadLabel(latlng, squadId) {
  const name = squadLabel(squadId);
  const html = `<span class="move-squad-label">${name}</span>`;
  const icon = L.divIcon({
    className: "move-squad-label-wrap",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0]
  });

  return L.marker(latlng, { icon, interactive: true, zIndexOffset: 800 });
}

function arrowTransform(angleDeg) {
  return `translate(-50%, -100%) rotate(${angleDeg}deg)`;
}

function routeArrowSvg(angleDeg, extraClass = "") {
  const cls = extraClass ? `route-arrow ${extraClass}` : "route-arrow";
  const style = angleDeg != null ? ` style="transform:${arrowTransform(angleDeg)}"` : "";
  return `<svg class="${cls}" viewBox="0 0 24 28"${style} aria-hidden="true"><polygon class="route-arrow__shape route-arrow__shape--outline" points="12,1 23,27 12,21 1,27"/><polygon class="route-arrow__shape" points="12,4 20,23 12,18.5 4,23"/></svg>`;
}

function createDirectionArrow(latlng, angleDeg) {
  const html = routeArrowSvg(angleDeg);
  const icon = L.divIcon({
    className: "route-arrow-wrap",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0]
  });

  return L.marker(latlng, { icon, interactive: true, zIndexOffset: 600 });
}

function setArrowMarkerAngle(marker, angleDeg) {
  const el = marker?.getElement()?.querySelector(".route-arrow");
  if (!el) return;
  el.style.transform = arrowTransform(angleDeg);
}

function routeArrowAngleDeg(obj) {
  const start = pairToLatLng(obj.points[0]);
  const end = pairToLatLng(obj.points[obj.points.length - 1]);
  return lineAngleDeg(start, end);
}

function findRouteIdFromTarget(target) {
  if (!target) return null;
  let el = target;
  while (el && el !== map.getContainer()) {
    for (const id in objects) {
      const o = objects[id];
      if (o.type !== "route") continue;
      const layers = [o.line, o.hitLine, o.startHandle, o.arrowMarker, o.squadMarker];
      for (const layer of layers) {
        const layerEl = layerElement(layer);
        if (layerEl && (layerEl === el || layerEl.contains(el))) return id;
      }
    }
    el = el.parentElement;
  }
  return null;
}

function rotateRouteArrow(routeId, deltaDeg) {
  const obj = objects[routeId];
  if (!obj || obj.type !== "route") return;

  setArrowMarkerAngle(obj.arrowMarker, routeArrowAngleDeg(obj));
}

function wheelRotateDelta(e) {
  return e.deltaY > 0 ? -ROUTE_ROTATE_STEP_DEG : ROUTE_ROTATE_STEP_DEG;
}

function syncTempArrow(end) {
  if (!drawing || !start) return;

  drawArrowAngleDeg = lineAngleDeg(start, end);

  if (!tempArrow) {
    tempArrow = createDirectionArrow(end, drawArrowAngleDeg);
    tempArrow.addTo(map);
  } else {
    tempArrow.setLatLng(end);
    setArrowMarkerAngle(tempArrow, drawArrowAngleDeg);
  }
}

function removeTempArrow() {
  if (!tempArrow) return;
  map.removeLayer(tempArrow);
  tempArrow = null;
}

function blockMapWheelZoom(e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}

function initRouteScrollRotate() {
  const container = map.getContainer();

  // Capture phase runs before Leaflet's scroll-wheel zoom handler.
  container.addEventListener(
    "wheel",
    (e) => {
      const routeId = findRouteIdFromTarget(e.target);
      if (!routeId) return;

      rotateRouteArrow(routeId, 0);
    },
    { passive: false, capture: true }
  );
}

function createRouteDragHandle(latlng) {
  const html = `<span class="route-drag-handle"></span>`;
  const icon = L.divIcon({
    className: "route-drag-handle-wrap",
    html,
    iconSize: [1, 1],
    iconAnchor: [0, 0]
  });

  return L.marker(latlng, { icon, interactive: true, zIndexOffset: 500 });
}

function addMarkerObject(id, markerType, squadId, latlng) {
  const type = normalizeMarkerType(markerType);
  const squad = isNeutralMarker(type) ? null : squadId;
  const marker = createTacticalMarker(latlng, type, squad);
  marker.addTo(map);

  const ll = latlng.lat !== undefined ? latlng : L.latLng(latlng[0], latlng[1]);

  objects[id] = {
    type,
    squad,
    marker,
    lat: ll.lat,
    lng: ll.lng
  };

  bindDeleteClick(marker, id);
}

/* =========================
   RADIAL MENU
========================= */
map.on("contextmenu", (e) => {
  L.DomEvent.stopPropagation(e);
  openToolMenu(e.originalEvent.clientX, e.originalEvent.clientY);
});

function positionToolMenu(menu, clientX, clientY) {
  const pad = 10;
  const bounds = {
    left: pad,
    top: pad,
    right: window.innerWidth - pad,
    bottom: window.innerHeight - pad
  };

  menu.style.display = "flex";
  menu.style.visibility = "hidden";
  menu.style.left = "0";
  menu.style.top = "0";

  const menuRect = menu.getBoundingClientRect();

  let left = clientX;
  let top = clientY;

  if (left + menuRect.width > bounds.right) {
    left = bounds.right - menuRect.width;
  }
  if (left < bounds.left) {
    left = bounds.left;
  }

  if (top + menuRect.height > bounds.bottom) {
    top = bounds.bottom - menuRect.height;
  }
  if (top < bounds.top) {
    top = bounds.top;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.visibility = "visible";
}

function openToolMenu(x, y) {
  const menu = document.getElementById("menu");
  if (!menu) return;

  let html = `<button type="button" class="tool-btn${mode === "route" ? " selected" : ""}" data-mode="route">Move line</button>`;

  for (const cat of MARKER_CATEGORIES) {
    html += `<div class="menu-category">${cat.label}</div>`;
    for (const item of cat.items) {
      html += `<button type="button" class="tool-btn${mode === item.type ? " selected" : ""}" data-mode="${item.type}">${item.label}</button>`;
    }
  }

  html += `<div class="menu-category">Tools</div>`;
  html += `<button type="button" class="tool-btn${!mode ? " selected" : ""}" data-mode="none">Remove</button>`;

  menu.innerHTML = html;

  menu.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const picked = btn.dataset.mode;
      setMode(picked === "none" ? null : picked);
    });
  });

  positionToolMenu(menu, x, y);
  menu.setAttribute("aria-hidden", "false");
}

document.addEventListener("click", (e) => {
  const menu = document.getElementById("menu");
  if (menu && !menu.contains(e.target)) {
    menu.style.display = "none";
    menu.setAttribute("aria-hidden", "true");
  }
});

function setMode(m) {
  mode = m;
  const menu = document.getElementById("menu");
  if (menu) {
    menu.style.display = "none";
    menu.setAttribute("aria-hidden", "true");
  }
  updateMapCursor();
}

function returnToRemoveMode() {
  setMode(null);
}

function updateMapCursor() {
  const container = map.getContainer();
  if (!mode) {
    container.style.cursor = "pointer";
    return;
  }
  if (mode === "route") {
    container.style.cursor = "crosshair";
    return;
  }
  container.style.cursor = "crosshair";
}

function canDraw() {
  return mode === "route";
}

function canPlaceMarker() {
  return isMarkerType(mode);
}

/* =========================
   DRAW LINES (route + arrow)
========================= */
map.on("mousedown", (e) => {
  if (!canDraw()) return;
  if (e.originalEvent.button !== 0) return;
  if (hitObjectLayer(e.originalEvent.target)) return;

  drawing = true;
  start = e.latlng;
  drawArrowAdjusted = false;
  drawArrowAngleDeg = 0;

  temp = L.polyline([start, start], { ...ROUTE_LINE_STYLE }).addTo(map);
  tempOutline = L.polyline([start, start], { ...ROUTE_OUTLINE_STYLE }).addTo(map);
  temp.bringToFront();

  map.dragging.disable();
  map.scrollWheelZoom.disable();
});

map.on("mousemove", (e) => {
  if (!drawing || !temp) return;
  const end = e.latlng;
  temp.setLatLngs([start, end]);
  tempOutline?.setLatLngs([start, end]);
  syncTempArrow(end);
});

map.on("mouseup", (e) => {
  if (!drawing) return;

  drawing = false;
  map.dragging.enable();
  map.scrollWheelZoom.enable();

  const end = e.latlng;
  const arrowAngle = drawArrowAngleDeg;
  map.removeLayer(temp);
  if (tempOutline) map.removeLayer(tempOutline);
  temp = null;
  tempOutline = null;
  removeTempArrow();

  if (map.distance(start, end) < 8) return;

  createRoute([start, end], activeSquad, arrowAngle);
  returnToRemoveMode();

  skipNextClick = true;
  start = null;
  drawArrowAdjusted = false;
});

/* =========================
   ROUTES (draggable move lines)
========================= */
function latLngToPair(ll) {
  return [ll.lat, ll.lng];
}

function pairToLatLng(pair) {
  return L.latLng(pair[0], pair[1]);
}

function createRoute(latlngs, squad, arrowAngleDeg) {
  const id = Date.now().toString();
  const points = latlngs.map(latLngToPair);
  const start = latlngs[0];
  const end = latlngs[latlngs.length - 1];
  const angle = arrowAngleDeg ?? lineAngleDeg(start, end);

  const outline = L.polyline(latlngs, ROUTE_OUTLINE_STYLE).addTo(map);
  const line = L.polyline(latlngs, ROUTE_LINE_STYLE).addTo(map);

  const hitLine = L.polyline(latlngs, {
    ...ROUTE_LINE_STYLE,
    weight: 16,
    opacity: 0,
    interactive: true,
    className: "route-hit"
  }).addTo(map);

  const obj = {
    type: "route",
    squad,
    outline,
    line,
    hitLine,
    points,
    arrowAngleDeg: angle,
    startHandle: null,
    arrowMarker: null,
    squadMarker: null
  };

  objects[id] = obj;
  bindDeleteClick(hitLine, id);
  setupRouteDecorations(id);

  socket.emit("updateMarkers", serialize());
  return id;
}

function removeRouteDecorations(obj) {
  if (!obj) return;
  if (obj.outline) map.removeLayer(obj.outline);
  if (obj.startHandle) map.removeLayer(obj.startHandle);
  if (obj.arrowMarker) map.removeLayer(obj.arrowMarker);
  if (obj.squadMarker) map.removeLayer(obj.squadMarker);
  if (obj.labels) obj.labels.forEach((l) => map.removeLayer(l));
  obj.startHandle = null;
  obj.arrowMarker = null;
  obj.squadMarker = null;
  obj.labels = null;
}

function setupRouteDecorations(id) {
  const obj = objects[id];
  if (!obj || obj.type !== "route") return;

  removeRouteDecorations(obj);

  const start = pairToLatLng(obj.points[0]);
  const end = pairToLatLng(obj.points[obj.points.length - 1]);
  const endIndex = obj.points.length - 1;

  obj.startHandle = createRouteDragHandle(start);
  obj.startHandle.addTo(map);
  enableRoutePointDrag(obj.startHandle, id, 0);
  bindDeleteClick(obj.startHandle, id);

  obj.arrowMarker = createDirectionArrow(end, routeArrowAngleDeg(obj));
  obj.arrowMarker.addTo(map);
  enableRoutePointDrag(obj.arrowMarker, id, endIndex);
  bindDeleteClick(obj.arrowMarker, id);

  refreshRouteLine(id);
}

function updateRouteDecorations(id) {
  const obj = objects[id];
  if (!obj || obj.type !== "route") return;

  const start = pairToLatLng(obj.points[0]);
  const end = pairToLatLng(obj.points[obj.points.length - 1]);
  obj.startHandle?.setLatLng(start);
  obj.arrowMarker?.setLatLng(end);
  setArrowMarkerAngle(obj.arrowMarker, routeArrowAngleDeg(obj));
}

function enableRoutePointDrag(marker, objectId, pointIndex) {
  marker.on("mousedown", (e) => {
    L.DomEvent.stopPropagation(e);
    handleDrag = { objectId, pointIndex, handle: marker };
    map.dragging.disable();
  });
}

map.on("mousemove", (e) => {
  if (!handleDrag) return;
  const obj = objects[handleDrag.objectId];
  if (!obj) return;

  obj.points[handleDrag.pointIndex] = latLngToPair(e.latlng);
  refreshRouteLine(handleDrag.objectId);
});

map.on("mouseup", () => {
  if (!handleDrag) return;
  handleDrag = null;
  map.dragging.enable();
  skipNextClick = true;
  socket.emit("updateMarkers", serialize());
});

function refreshRouteLine(id) {
  const obj = objects[id];
  if (!obj?.line) return;
  const latlngs = obj.points.map(pairToLatLng);
  if (obj.outline) obj.outline.setLatLngs(latlngs);
  obj.line.setLatLngs(latlngs);
  if (obj.hitLine) obj.hitLine.setLatLngs(latlngs);
  updateRouteDecorations(id);
}

function bindDeleteClick(layer, objectId) {
  layer.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    if (skipNextClick) {
      skipNextClick = false;
      return;
    }
    if (mode !== null) return;
    deleteObject(objectId);
  });
}

/* =========================
   CLICK: DELETE + MARKERS
========================= */
map.on("click", (e) => {
  if (skipNextClick) {
    skipNextClick = false;
    return;
  }

  if (!canPlaceMarker()) return;

  const id = Date.now().toString();
  addMarkerObject(id, mode, isNeutralMarker(mode) ? null : activeSquad, e.latlng);

  socket.emit("updateMarkers", serialize());
  returnToRemoveMode();
});

function hitObjectLayer(target) {
  if (!target) return false;
  let el = target;
  while (el && el !== map.getContainer()) {
    for (const id in objects) {
      const o = objects[id];
      if (layerElement(o.line) === el || layerElement(o.hitLine) === el) {
        return true;
      }
      for (const layer of [o.startHandle, o.arrowMarker, o.squadMarker]) {
        const layerEl = layerElement(layer);
        if (layerEl && (layerEl === el || layerEl.contains(el))) return true;
      }
      if (o.labels?.some((l) => {
        const labelEl = layerElement(l);
        return labelEl && (labelEl === el || labelEl.contains(el));
      })) {
        return true;
      }
      const markerEl = layerElement(o.marker);
      if (markerEl && (markerEl === el || markerEl.contains(el))) return true;
    }
    el = el.parentElement;
  }
  return false;
}

function layerElement(layer) {
  if (!layer) return null;
  return layer.getElement ? layer.getElement() : layer._path || layer._icon || null;
}

/* =========================
   DELETE
========================= */
function deleteObject(id) {
  const o = objects[id];
  if (!o) return;

  if (o.line) map.removeLayer(o.line);
  if (o.hitLine) map.removeLayer(o.hitLine);
  if (o.marker) map.removeLayer(o.marker);
  removeRouteDecorations(o);

  delete objects[id];
  socket.emit("updateMarkers", serialize());
}

/* =========================
   SYNC
========================= */
socket.on("load", applyServerState);
socket.on("mapChanged", applyServerState);
socket.on("rconStatus", (state) => {
  if (state && typeof state === "object") updateCurrentMapDisplay(state);
});
socket.on("liveState", (payload) => {
  if (!payload || typeof payload !== "object") return;
  const mapId = payload.mapId || currentMapId;
  if (!mapId) return;
  renderLiveState(mapId, payload, map);
  window.dispatchEvent(new CustomEvent("liveStateUpdate", { detail: { ...payload, mapId } }));
});
socket.on("markersUpdated", (state) => {
  rebuildMarkersIfChanged(Array.isArray(state) ? state : state?.markers || []);
});

function applyMapFromState(state) {
  updateCurrentMapDisplay(state);

  const mapId = state.currentMapId;
  const image = state.currentMap?.image;
  if (mapId && mapId !== currentMapId) {
    clearLiveLayer();
  }

  if (!mapId || !image) return;

  if (mapId !== currentMapId || !mapOverlay) {
    setMapImage(image, mapId);
  }

  if (state.live) {
    renderLiveState(mapId, state.live, map);
  }
}

function applyServerState(state) {
  if (Array.isArray(state)) {
    rebuildMarkersIfChanged(state);
    return;
  }

  if (!state || typeof state !== "object") return;

  applyMapFromState(state);
  rebuildMarkersIfChanged(state.markers || []);
}

function markersFingerprint(data) {
  const list = (Array.isArray(data) ? data : []).filter((m) => m.type !== "arrow");
  const normalized = list
    .map((m) => ({ ...m }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return JSON.stringify(normalized);
}

function rebuildMarkersIfChanged(data) {
  const incoming = markersFingerprint(data);
  if (incoming === markersFingerprint(serialize())) return;
  rebuildMarkers(data);
}

/* =========================
   SERIALIZE
========================= */
function serialize() {
  return Object.keys(objects).map((id) => {
    const o = objects[id];

    if (o.type === "route") {
      return {
        id,
        type: "route",
        squad: o.squad,
        points: o.points,
        arrowAngleDeg: routeArrowAngleDeg(o)
      };
    }

    const entry = { id, type: o.type, lat: o.lat, lng: o.lng };
    if (o.squad != null) entry.squad = o.squad;
    return entry;
  });
}

/* =========================
   REBUILD
========================= */
function rebuildMarkers(data) {
  const cleaned = data.filter((m) => m.type !== "arrow");

  Object.values(objects).forEach((o) => {
    if (o.outline) map.removeLayer(o.outline);
    if (o.line) map.removeLayer(o.line);
    if (o.hitLine) map.removeLayer(o.hitLine);
    if (o.marker) map.removeLayer(o.marker);
    removeRouteDecorations(o);
  });

  objects = {};

  cleaned.forEach((m) => {
    const id = m.id;

    if (m.type === "route") {
      const latlngs = m.points.map(pairToLatLng);

      const outline = L.polyline(latlngs, ROUTE_OUTLINE_STYLE).addTo(map);
      const line = L.polyline(latlngs, ROUTE_LINE_STYLE).addTo(map);

      const hitLine = L.polyline(latlngs, {
        ...ROUTE_LINE_STYLE,
        weight: 16,
        opacity: 0,
        interactive: true,
        className: "route-hit"
      }).addTo(map);

      const routeStart = latlngs[0];
      const routeEnd = latlngs[latlngs.length - 1];

      objects[id] = {
        type: "route",
        squad: m.squad,
        outline,
        line,
        hitLine,
        points: m.points,
        arrowAngleDeg: lineAngleDeg(routeStart, routeEnd),
        startHandle: null,
        arrowMarker: null,
        squadMarker: null
      };

      bindDeleteClick(hitLine, id);
      setupRouteDecorations(id);
      return;
    }

    const type = normalizeMarkerType(m.type);
    const squad = isNeutralMarker(type) ? null : (m.squad || 1);
    addMarkerObject(id, type, squad, [m.lat, m.lng]);
  });

  if (cleaned.length !== data.length) {
    socket.emit("updateMarkers", serialize());
  }
}
