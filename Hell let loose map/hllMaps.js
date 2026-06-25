const HLL_MAPS = [
  { id: "carentan", name: "Carentan", image: "/maps/tac_carentan.webp", aliases: ["carentan", "car_"] },
  { id: "driel", name: "Driel", image: "/maps/tac_driel.webp", aliases: ["driel", "drl_"] },
  { id: "el-alamein", name: "El Alamein", image: "/maps/tac_elalamein.webp", aliases: ["elalamein", "ela_"] },
  { id: "elsenborn-ridge", name: "Elsenborn Ridge", image: "/maps/tac_elsenbornridge.webp", aliases: ["elsenbornridge", "elsenborn"] },
  { id: "foy", name: "Foy", image: "/maps/tac_foy.webp", aliases: ["foy"] },
  { id: "hill-400", name: "Hill 400", image: "/maps/tac_hill400.webp", aliases: ["hill400", "hil_"] },
  { id: "hurtgen-forest", name: "Hurtgen Forest", image: "/maps/tac_hurtgenforest.webp", aliases: ["hurtgenforest", "hurtgen"] },
  { id: "juno-beach", name: "Juno Beach", image: "/maps/tac_junobeach.webp", aliases: ["juno", "junobeach"] },
  { id: "kharkov", name: "Kharkov", image: "/maps/tac_kharkov.webp", aliases: ["kharkov"] },
  { id: "kursk", name: "Kursk", image: "/maps/tac_kursk.webp", aliases: ["kursk"] },
  { id: "mortain", name: "Mortain", image: "/maps/tac_mortain.webp", aliases: ["mortain"] },
  { id: "omaha-beach", name: "Omaha Beach", image: "/maps/tac_omahabeach.webp", aliases: ["omahabeach", "omaha"] },
  { id: "purple-heart-lane", name: "Purple Heart Lane", image: "/maps/tac_purpleheartlane.webp", aliases: ["purpleheartlane", "phl_"] },
  { id: "remagen", name: "Remagen", image: "/maps/tac_remagen.webp", aliases: ["remagen"] },
  { id: "sainte-marie-du-mont", name: "Sainte-Marie-du-Mont", image: "/maps/tac_stmariedumont.webp", aliases: ["stmariedumont", "smdm_"] },
  { id: "sainte-mere-eglise", name: "Sainte-Mere-Eglise", image: "/maps/tac_stmereeglise.webp", aliases: ["stmereeglise", "sme_"] },
  { id: "smolensk", name: "Smolensk", image: "/maps/tac_smolensk.webp", aliases: ["smolensk"] },
  { id: "stalingrad", name: "Stalingrad", image: "/maps/tac_stalingrad.webp", aliases: ["stalingrad"] },
  { id: "tobruk", name: "Tobruk", image: "/maps/tac_tobruk.webp", aliases: ["tobruk"] },
  { id: "utah-beach", name: "Utah Beach", image: "/maps/tac_utahbeach.webp", aliases: ["utahbeach", "utah"] }
];

function normalizeMapId(value) {
  if (!value) return null;
  const raw = String(value)
    .trim()
    .replace(/_RESTART$/i, "")
    .replace(/_(warfare|offensive_us|offensive_ger|offensive_uk|off_us|off_ger|off_uk)(?:_|$).*/i, "");
  const lowered = raw.toLowerCase();
  const compact = lowered.replace(/[^a-z0-9]/g, "");

  return HLL_MAPS.find((map) => {
    if (map.id === lowered) return true;
    if (map.id.replace(/[^a-z0-9]/g, "") === compact) return true;
    if (map.name.toLowerCase() === lowered) return true;
    return map.aliases.some((alias) => {
      const aliasLower = alias.toLowerCase();
      return lowered.includes(aliasLower) || compact.includes(aliasLower.replace(/[^a-z0-9]/g, ""));
    });
  })?.id || null;
}

function mapById(id) {
  return HLL_MAPS.find((map) => map.id === id) || null;
}

module.exports = {
  HLL_MAPS,
  mapById,
  normalizeMapId
};
