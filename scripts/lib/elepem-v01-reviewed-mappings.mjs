// Human-reviewed reconciliation decisions already used by the legacy v01 sync.
// They are data inputs, not fuzzy matching rules. New ambiguities must be sent
// to review instead of being added here automatically.

export const EXCLUDED_SOURCE_IDS = new Map([
  [
    "ELP-0085",
    "extracción PDF concatenada: nombre y dirección mezclan decenas de filas",
  ],
  [
    "ELP-0181",
    "agrupación de origen defectuosa: mezcla ELP-0180 y ELP-0182",
  ],
]);

export const SOURCE_MERGE_GROUPS = [
  { representative: "ELP-0019", members: ["ELP-0018", "ELP-0019"] },
  { representative: "ELP-0023", members: ["ELP-0022", "ELP-0023"] },
  { representative: "ELP-0036", members: ["ELP-0036", "ELP-0037"] },
  { representative: "ELP-0042", members: ["ELP-0042", "ELP-0043"] },
  { representative: "ELP-0056", members: ["ELP-0056", "ELP-0057"] },
  { representative: "ELP-0118", members: ["ELP-0117", "ELP-0118"] },
  {
    representative: "ELP-0129",
    members: ["ELP-0128", "ELP-0129", "ELP-0130"],
    geocode: "ELP-0128",
  },
  { representative: "ELP-0135", members: ["ELP-0135", "ELP-0136"] },
  { representative: "ELP-0147", members: ["ELP-0146", "ELP-0147"] },
  { representative: "ELP-0215", members: ["ELP-0215", "ELP-0260"] },
  {
    representative: "ELP-0221",
    members: ["ELP-0220", "ELP-0221"],
    geocode: "ELP-0220",
  },
  { representative: "ELP-0229", members: ["ELP-0229", "ELP-0230"] },
  { representative: "ELP-0231", members: ["ELP-0231", "ELP-0232"] },
  { representative: "ELP-0234", members: ["ELP-0234", "ELP-0253"] },
  { representative: "ELP-0236", members: ["ELP-0236", "ELP-0237"] },
  {
    representative: "ELP-0331",
    members: ["ELP-0330", "ELP-0331"],
    geocode: "ELP-0330",
  },
  { representative: "ELP-0339", members: ["ELP-0339", "ELP-0340"] },
  { representative: "ELP-0363", members: ["ELP-0362", "ELP-0363"] },
  {
    representative: "ELP-0418",
    members: ["ELP-0418", "ELP-0419"],
    geocode: "ELP-0419",
  },
  { representative: "ELP-0442", members: ["ELP-0441", "ELP-0442"] },
  { representative: "ELP-0462", members: ["ELP-0462", "ELP-0463"] },
  {
    representative: "ELP-0470",
    members: ["ELP-0469", "ELP-0470"],
    geocode: "ELP-0469",
  },
  {
    representative: "ELP-0474",
    members: ["ELP-0474", "ELP-0647"],
    geocode: "ELP-0647",
  },
  { representative: "ELP-0636", members: ["ELP-0636", "ELP-0637"] },
  { representative: "ELP-0685", members: ["ELP-0644", "ELP-0685"] },
  { representative: "ELP-0670", members: ["ELP-0669", "ELP-0670"] },
  { representative: "ELP-0699", members: ["ELP-0699", "ELP-0700"] },
  { representative: "ELP-0713", members: ["ELP-0712", "ELP-0713"] },
  { representative: "ELP-0714", members: ["ELP-0714", "ELP-0722"] },
  {
    representative: "ELP-0717",
    members: ["ELP-0717", "ELP-0718"],
    geocode: "ELP-0718",
  },
  { representative: "ELP-0758", members: ["ELP-0757", "ELP-0758"] },
  {
    representative: "ELP-0765",
    members: ["ELP-0764", "ELP-0765"],
    geocode: "ELP-0764",
  },
  { representative: "ELP-0769", members: ["ELP-0769", "ELP-0770"] },
  { representative: "ELP-0791", members: ["ELP-0791", "ELP-0794"] },
  {
    representative: "ELP-0319",
    members: ["ELP-0318", "ELP-0319"],
    geocode: "ELP-0319",
  },
  {
    representative: "ELP-0376",
    members: ["ELP-0376", "ELP-0593"],
    geocode: "ELP-0376",
  },
  {
    representative: "ELP-0409",
    members: ["ELP-0409", "ELP-0411"],
    geocode: "ELP-0409",
  },
  {
    representative: "ELP-0484",
    members: ["ELP-0415", "ELP-0484"],
    geocode: "ELP-0484",
  },
  {
    representative: "ELP-0774",
    members: ["ELP-0771", "ELP-0774"],
    geocode: "ELP-0774",
  },
  {
    representative: "ELP-0788",
    members: ["ELP-0788", "ELP-0789"],
    geocode: "ELP-0788",
  },
];

export const SOURCE_MEMBERSHIP_CORRECTIONS = new Map([
  [
    "ELP-0033",
    {
      mides_social: true,
      labels: ["Certificado Social MIDES"],
      source_record_ids: ["MIDES-019"],
      reason:
        "Puga Soria fue unido por error a ELP-0032 (Hogar Intergeneracional de Pando).",
    },
  ],
  [
    "ELP-0180",
    {
      mides_social: true,
      msp_registro_historico: true,
      pacp: true,
      labels: [
        "Certificado Social MIDES",
        "Certificado de registro MSP (histórico)",
        "Proveedor PACP",
      ],
      source_record_ids: ["MIDES-050", "MSPR-091-2021", "PACP-012"],
      reason:
        "Registros de Sarandí Grande separados de la entidad conflada ELP-0181.",
    },
  ],
  [
    "ELP-0182",
    {
      mides_social: true,
      msp_registro_historico: true,
      labels: [
        "Certificado Social MIDES",
        "Certificado de registro MSP (histórico)",
      ],
      source_record_ids: [
        "MIDES-047",
        "MSPR-041-2018",
        "MSPR-084-2019",
        "MSPR-129-2019",
      ],
      reason:
        "Registros de Florida ciudad separados de la entidad conflada ELP-0181.",
    },
  ],
]);

export const KNOWN_EXISTING_MATCHES = new Map([
  ["ELP-0067", "MSP24-168"],
  ["ELP-0100", "MSP24-207"],
  ["ELP-0106", "MSP24-179"],
  ["ELP-0114", "MSP24-177"],
  ["ELP-0115", "MSP24-178"],
  ["ELP-0118", "MSP24-182"],
  ["ELP-0180", "MSP24-186"],
  ["ELP-0229", "MSP24-188"],
  ["ELP-0421", "MSP24-117"],
  ["ELP-0686", "MSP24-067"],
  ["ELP-0734", "MSP24-195"],
  ["ELP-0755", "MSP24-202"],
  ["ELP-0768", "MSP24-201"],
  ["ELP-0774", "MSP24-199"],
  ["ELP-0788", "MSP24-204"],
]);

export const KNOWN_DISTINCT_FROM_EXISTING = new Map([
  ["ELP-0393", "MSP24-040"],
  ["ELP-0587", "MSP24-046"],
]);
