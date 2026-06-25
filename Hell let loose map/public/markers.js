/* Hell Let Loose tactical marker definitions */

/* Symmetric shield — flat top, point centered at (14, 30) - more accurate to game */
const HLL_SHIELD = "M4 2H24L26 15L14 30L2 15Z";

const MARKER_ICON_SIZE = [56, 50];
const MARKER_ICON_ANCHOR = [28, 50];

const HLL_MARKER_RED = "#e02424";
const HLL_MARKER_STROKE = "#141414";
const HLL_ICON_STROKE_WIDTH = 1.8;
const ORDER_MARKER_TYPES = new Set(["attack", "defend", "observe"]);

const MARKER_CATEGORIES = [
  {
    id: "ping",
    label: "Standard Ping",
    items: [
      { type: "ping", label: "Enemy Ping", desc: "General ping — usually enemy sighted" }
    ]
  },
  {
    id: "orders",
    label: "Orders",
    items: [
      { type: "attack", label: "Attack", desc: "Attack this position" },
      { type: "defend", label: "Defend", desc: "Defend this position" },
      { type: "observe", label: "Observe", desc: "Watch this position" }
    ]
  },
  {
    id: "requests",
    label: "Requests",
    items: [
      { type: "request-node", label: "Resource Node", desc: "Build a resource node here" },
      { type: "request-supplies", label: "Supplies", desc: "Build a supply stockpile here" },
      { type: "place-garrison", label: "Garrison", desc: "Build a garrison here" },
      { type: "place-outpost", label: "Outpost", desc: "Build an outpost here" }
    ]
  },
  {
    id: "callins",
    label: "Call-ins",
    items: [
      { type: "call-bomber", label: "Bomber", desc: "Request a bombing run" },
      { type: "call-strafe", label: "Strafing Run", desc: "Request a strafing run" },
      { type: "call-supplies", label: "Supply Drop", desc: "Request a supply drop" },
      { type: "call-artillery", label: "Artillery (HE)", desc: "Request HE artillery" },
      { type: "call-smoke", label: "Artillery (Smoke)", desc: "Request smoke artillery" }
    ]
  },
  {
    id: "spots",
    label: "Spots",
    items: [
      { type: "spot-infantry", label: "Enemy Infantry", desc: "Enemy infantry spotted" },
      { type: "spot-light-vehicle", label: "Enemy Light Vehicle", desc: "Enemy light vehicle spotted" },
      { type: "spot-tank", label: "Enemy Tank", desc: "Enemy tank spotted" },
      { type: "spot-outpost", label: "Enemy Outpost", desc: "Enemy outpost spotted" },
      { type: "spot-garrison", label: "Enemy Garrison", desc: "Enemy garrison spotted" }
    ]
  }
];

const MARKER_TYPES = Object.fromEntries(
  MARKER_CATEGORIES.flatMap((cat) => cat.items.map((item) => [item.type, { ...item, category: cat.id }]))
);

const HLL_ASSET_BASE = "/assets/hll/";

const MARKER_ASSETS = {
  "request-node": { src: "node-batch.png", size: [44, 44] },
  "request-supplies": { src: "supplies-plain.png", size: [34, 34] },
  "place-garrison": { src: "garry-plain.png", size: [36, 36] },
  "place-outpost": { src: "outpost-normal-plain.png", size: [38, 38] },
  "call-bomber": { src: "bombing-run.png", size: [94, 26] },
  "call-strafe": { src: "strafing-run.png", size: [112, 18] },
  "call-supplies": { src: "supply-drop.png", size: [36, 36] },
  "call-artillery": { src: "arty.png", size: [36, 25] },
  "call-smoke": { src: "arty-effect.png", size: [38, 38] },
  "spot-infantry": { src: "enemy-infantry.png", size: [36, 36] },
  "spot-light-vehicle": { src: "enemy-vehicle.png", size: [36, 36] },
  "spot-tank": { src: "enemy-tank.png", size: [36, 36] },
  "spot-outpost": { src: "enemy-op.png", size: [36, 36] },
  "spot-garrison": { src: "enemy-garry.png", size: [36, 36] }
};

const LEGACY_MARKER_TYPES = {
  enemy: "spot-infantry"
};

function normalizeMarkerType(type) {
  return LEGACY_MARKER_TYPES[type] || type;
}

function isMarkerType(type) {
  return Boolean(type && type !== "route" && MARKER_TYPES[normalizeMarkerType(type)]);
}

function markerLabel(type) {
  const key = normalizeMarkerType(type);
  return MARKER_TYPES[key]?.label || type;
}

function isNeutralMarker(type) {
  const key = normalizeMarkerType(type);
  const def = MARKER_TYPES[key];
  return def?.category === "spots" || key === "ping";
}

function markerFillColor(type, squadColor) {
  const key = normalizeMarkerType(type);
  const def = MARKER_TYPES[key];
  if (!def) return squadColor;
  if (isNeutralMarker(key)) return HLL_MARKER_RED;
  return squadColor;
}

const ICON_CENTER_X = 14;
const ICON_CENTER_Y = 15;

const ICON_OUTPOST =
  `<line x1="0" y1="-7" x2="0" y2="7" stroke="#fff" stroke-width="1.8"/><line x1="-5" y1="-4" x2="5" y2="-4" stroke="#fff" stroke-width="1.6"/><line x1="-4" y1="0" x2="4" y2="0" stroke="#fff" stroke-width="1.6"/><line x1="-3" y1="4" x2="3" y2="4" stroke="#fff" stroke-width="1.6"/>`;

const ICON_GARRISON =
  `<line x1="-1" y1="-6" x2="-1" y2="7" stroke="#fff" stroke-width="1.8"/><path d="M-1 -6h5.5l-2 3.5H-1V-6z" fill="#fff" stroke="#fff" stroke-width="1.8"/>`;

function centeredIcon(paths) {
  return `<g transform="translate(${ICON_CENTER_X} ${ICON_CENTER_Y})">${paths}</g>`;
}

function markerIconPaths(type) {
  const key = normalizeMarkerType(type);
  switch (key) {
    case "ping":
      return `<polygon points="14,3 25,27 3,27" fill="${HLL_MARKER_RED}" stroke="${HLL_MARKER_STROKE}" stroke-width="1.8" stroke-linejoin="round"/><text x="14" y="19" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="14" font-weight="800">!</text>`;
    case "attack":
      return centeredIcon(
        `<circle r="5.5" fill="none" stroke="#fff" stroke-width="1.8"/><line x1="0" y1="-7.5" x2="0" y2="7.5" stroke="#fff" stroke-width="1.8"/><line x1="-7.5" y1="0" x2="7.5" y2="0" stroke="#fff" stroke-width="1.8"/>`
      );
    case "defend":
      return centeredIcon(
        `<path d="M0 -6.5l5.5 2.5v3.8c0 2.8-2.2 4.8-5.5 5.8-3.3-1-5.5-3-5.5-5.8v-3.8L0 -6.5z" fill="#fff" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`
      );
    case "observe":
      return centeredIcon(
        `<path d="M0 -4.5c3.6 0 6.2 2.4 6.2 4.5s-2.6 4.5-6.2 4.5-6.2-2.4-6.2-4.5 2.6-4.5 6.2-4.5z" fill="none" stroke="#fff" stroke-width="1.8"/><circle r="2" fill="#fff" stroke="#fff" stroke-width="1.8"/>`
      );
    case "request-node":
      return centeredIcon(`<rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" fill="#fff" stroke="#fff" stroke-width="1.8"/>`);
    case "request-supplies":
      return centeredIcon(
        `<rect x="-6" y="-4" width="12" height="8" rx="1" fill="none" stroke="#fff" stroke-width="1.8"/><line x1="-3" y1="-4" x2="-3" y2="4" stroke="#fff" stroke-width="1.5"/><line x1="0" y1="-4" x2="0" y2="4" stroke="#fff" stroke-width="1.5"/><line x1="3" y1="-4" x2="3" y2="4" stroke="#fff" stroke-width="1.5"/>`
      );
    case "place-garrison":
      return centeredIcon(ICON_GARRISON);
    case "place-outpost":
      return centeredIcon(ICON_OUTPOST);
    case "call-bomber":
      return centeredIcon(
        `<ellipse cx="-4" cy="0" rx="3" ry="2" fill="#fff" stroke="#fff" stroke-width="1.8"/><ellipse cx="4" cy="0" rx="3" ry="2" fill="#fff" stroke="#fff" stroke-width="1.8"/><rect x="-7" y="-1.2" width="14" height="2.4" rx="1" fill="#fff" stroke="#fff" stroke-width="1.8"/>`
      );
    case "call-strafe":
      return centeredIcon(
        `<path d="M-6.5 2l6.5-4 6.5 2.8-6.5 4.2-6.5-3z" fill="#fff" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><line x1="-3.5" y1="5" x2="-3.5" y2="7.5" stroke="#fff" stroke-width="1.5"/><line x1="0" y1="5" x2="0" y2="7.5" stroke="#fff" stroke-width="1.5"/><line x1="3.5" y1="5" x2="3.5" y2="7.5" stroke="#fff" stroke-width="1.5"/>`
      );
    case "call-supplies":
      return centeredIcon(
        `<path d="M-8 0c0-3.5 3.5-5.5 8-5.5s8 2 8 5.5" fill="none" stroke="#fff" stroke-width="1.8"/><line x1="-4" y1="0" x2="-6" y2="7" stroke="#fff" stroke-width="1.5"/><line x1="4" y1="0" x2="6" y2="7" stroke="#fff" stroke-width="1.5"/><rect x="-4" y="6" width="8" height="2.5" fill="#fff" stroke="#fff" stroke-width="1.8"/>`
      );
    case "call-artillery":
      return centeredIcon(
        `<rect x="-6.5" y="-5.5" width="3.2" height="11" rx="1.1" fill="#fff" stroke="#fff" stroke-width="1.8"/><rect x="-1.6" y="-5.5" width="3.2" height="11" rx="1.1" fill="#fff" stroke="#fff" stroke-width="1.8"/><rect x="3.3" y="-5.5" width="3.2" height="11" rx="1.1" fill="#fff" stroke="#fff" stroke-width="1.8"/>`
      );
    case "call-smoke":
      return centeredIcon(
        `<path d="M-6 2c0-1.8 1.3-3 3-3 0-1.8 1.8-3 3.8-3 2 0 3.5 1.2 3.5 3 1.7 0 3 1.2 3 3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`
      );
    case "spot-infantry":
      return centeredIcon(
        `<circle cx="0" cy="-3.5" r="2.8" fill="#fff" stroke="#fff" stroke-width="1.8"/><path d="M-5.5 7.5c0-3.2 2.2-5 5.5-5s5.5 1.8 5.5 5" fill="#fff" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`
      );
    case "spot-light-vehicle":
      return centeredIcon(
        `<circle r="5.5" fill="none" stroke="#fff" stroke-width="1.8"/><circle r="1.8" fill="#fff" stroke="#fff" stroke-width="1.8"/><line x1="0" y1="-5.5" x2="0" y2="-3.8" stroke="#fff" stroke-width="1.5"/><line x1="0" y1="3.8" x2="0" y2="5.5" stroke="#fff" stroke-width="1.5"/><line x1="-5.5" y1="0" x2="-3.8" y2="0" stroke="#fff" stroke-width="1.5"/><line x1="3.8" y1="0" x2="5.5" y2="0" stroke="#fff" stroke-width="1.5"/>`
      );
    case "spot-tank":
      return centeredIcon(
        `<rect x="-7" y="0" width="11" height="5" rx="1.3" fill="#fff" stroke="#fff" stroke-width="1.8"/><rect x="0" y="-3" width="6" height="3.5" rx="0.8" fill="#fff" stroke="#fff" stroke-width="1.8"/><line x1="6" y1="-1.2" x2="8.5" y2="-1.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`
      );
    case "spot-outpost":
      return centeredIcon(ICON_OUTPOST);
    case "spot-garrison":
      return centeredIcon(ICON_GARRISON);
    default:
      return centeredIcon(`<circle r="4" fill="#fff" stroke="#fff" stroke-width="1.8"/>`);
  }
}

function markerShieldSvg(type, fillColor, extraClass = "") {
  const key = normalizeMarkerType(type);
  const cls = extraClass ? `hll-marker__shape ${extraClass}` : "hll-marker__shape";

  if (key === "ping") {
    return `<svg class="${cls} hll-marker__shape--ping" viewBox="0 0 28 30" aria-hidden="true">${markerIconPaths(key)}</svg>`;
  }

  if (ORDER_MARKER_TYPES.has(key)) {
    return orderMarkerSvg(key, fillColor);
  }

  return `<svg class="${cls}" viewBox="0 0 28 32" aria-hidden="true"><path d="${HLL_SHIELD}" fill="${fillColor}" stroke="${HLL_MARKER_STROKE}" stroke-width="1.4" stroke-linejoin="round"/>${markerIconPaths(key)}</svg>`;
}

function orderMarkerSvg(type, color) {
  const key = normalizeMarkerType(type);
  const stroke = HLL_MARKER_STROKE;
  const fill = color || "#00ff00";

  if (key === "observe") {
    return `
      <svg class="hll-marker__order hll-marker__order--observe" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M3 16c4.2-6.1 8.8-8.6 13-8.6S24.8 9.9 29 16c-4.2 6.1-8.8 8.6-13 8.6S7.2 22.1 3 16Z" fill="${fill}" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="16" cy="16" r="4.4" fill="${stroke}"/>
        <circle cx="17.7" cy="14.2" r="1.3" fill="#fff" opacity="0.9"/>
      </svg>`;
  }

  if (key === "attack") {
    return `
      <svg class="hll-marker__order hll-marker__order--attack" viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 26 25.5 8.5" fill="none" stroke="${stroke}" stroke-width="6.8" stroke-linecap="round"/>
        <path d="M8 26 25.5 8.5" fill="none" stroke="${fill}" stroke-width="4.2" stroke-linecap="round"/>
        <path d="M19.4 7.2h7.4v7.4" fill="none" stroke="${stroke}" stroke-width="5.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19.4 7.2h7.4v7.4" fill="none" stroke="${fill}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
  }

  return `
    <svg class="hll-marker__order hll-marker__order--defend" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3.5 26 7.8v7.5c0 6-4.1 10.2-10 13.2-5.9-3-10-7.2-10-13.2V7.8L16 3.5Z" fill="${stroke}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M16 6.8 23 9.8v5.4c0 4.2-2.7 7.3-7 9.8-4.3-2.5-7-5.6-7-9.8V9.8l7-3Z" fill="${fill}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" opacity="0.95"/>
    </svg>`;
}

function markerAsset(type) {
  return MARKER_ASSETS[normalizeMarkerType(type)];
}

function markerAssetHtml(type) {
  const asset = markerAsset(type);
  if (!asset) return "";
  const [width, height] = asset.size;
  return `<img class="hll-marker__asset" src="${HLL_ASSET_BASE}${asset.src}" width="${width}" height="${height}" alt="">`;
}

function markerTagText(type, squadName) {
  const key = normalizeMarkerType(type);
  if (isNeutralMarker(key)) return markerLabel(key);
  return squadName;
}

function markerHtml(type, squadName, squadColor, legend = false) {
  const key = normalizeMarkerType(type);
  const fill = markerFillColor(key, squadColor);
  const neutral = isNeutralMarker(key);
  const asset = markerAsset(key);
  const neutralClass = neutral ? " hll-marker--neutral" : "";
  const orderClass = ORDER_MARKER_TYPES.has(key) ? " hll-marker--order" : "";
  const assetClass = asset ? " hll-marker--asset" : "";
  const wideClass = asset && asset.size[0] > 60 ? " hll-marker--wide" : "";
  const tagClass = neutral ? "hll-marker__tag hll-marker__tag--intel" : "hll-marker__tag hll-marker__tag--squad";
  const tagHtml = legend ? "" : `<span class="${tagClass}">${markerTagText(key, squadName)}</span>`;
  const visualHtml = asset ? markerAssetHtml(key) : markerShieldSvg(key, fill);

  const legendClass = legend ? " hll-marker--legend" : "";
  return `<div class="hll-marker hll-marker--${key}${neutralClass}${orderClass}${assetClass}${wideClass}${legendClass}">${tagHtml}${visualHtml}</div>`;
}

function markerIconLayout(type) {
  const key = normalizeMarkerType(type);
  const asset = markerAsset(key);
  if (asset) {
    const [visualWidth, visualHeight] = asset.size;
    const width = Math.max(56, visualWidth);
    const height = visualHeight + (isNeutralMarker(key) ? 18 : 20);
    return {
      iconSize: [width, height],
      iconAnchor: [width / 2, height]
    };
  }

  if (ORDER_MARKER_TYPES.has(key)) {
    return {
      iconSize: [56, 50],
      iconAnchor: [28, 50]
    };
  }

  if (isNeutralMarker(key)) {
    return {
      iconSize: key === "ping" ? [56, 46] : MARKER_ICON_SIZE,
      iconAnchor: key === "ping" ? [28, 46] : MARKER_ICON_ANCHOR
    };
  }
  return { iconSize: MARKER_ICON_SIZE, iconAnchor: MARKER_ICON_ANCHOR };
}

function allMarkerMenuItems() {
  return MARKER_CATEGORIES.flatMap((cat) => cat.items);
}
