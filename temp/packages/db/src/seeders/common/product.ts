import {
  commonDefinition,
  defaultRow,
  rowsWithDefault,
  simpleRowsWithDefault,
} from "./common-master-definitions";
import { createCommonMasterSeeder } from "./common-master-seeder";

const productGroupRows = simpleRowsWithDefault([
  ["COMP", "Computers"],
  ["COMP-ACC", "Computer Accessories"],
  ["WOVEN", "Woven"],
  ["KNITTED", "Knitted"],
]);

const productCategoryRows = [
  {
    ...defaultRow(),
    image: null,
    position_order: 0,
    show_on_storefront_top_menu: false,
    show_on_storefront_catalog: false,
  },
];

const productTypeRows = simpleRowsWithDefault([
  ["GOODS", "Goods"],
  ["SERVICE", "Service"],
  ["UNKNOWN", "Unknown"],
]);

const brandRows = simpleRowsWithDefault([["GEN", "Generic"]]);

const colourRows = rowsWithDefault(
  [
    ["BLACK", "Black", "#000000"],
    ["WHITE", "White", "#FFFFFF"],
    ["GREY", "Grey", "#808080"],
    ["NAVY", "Navy", "#1F2A44"],
    ["BLUE", "Blue", "#2563EB"],
    ["RED", "Red", "#DC2626"],
    ["GREEN", "Green", "#16A34A"],
    ["YELLOW", "Yellow", "#FACC15"],
    ["ORANGE", "Orange", "#F97316"],
    ["PINK", "Pink", "#EC4899"],
    ["PURPLE", "Purple", "#9333EA"],
    ["BROWN", "Brown", "#92400E"],
    ["BEIGE", "Beige", "#D6C6A8"],
    ["MAROON", "Maroon", "#800000"],
    ["OLIVE", "Olive", "#808000"],
  ].map(([code, name, hex_code]) => ({ code, name, description: name, hex_code })),
  { hex_code: null },
);

const sizeRows = rowsWithDefault(
  [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "All Sizes",
    "2-4 years",
    "4-6 years",
    "6-8 years",
    "8-10 years",
  ].map((name, index) => ({
    code: name.toUpperCase().replaceAll(" ", "-"),
    name,
    description: name,
    sort_order: index + 1,
  })),
  { sort_order: 0 },
);

const styleRows = simpleRowsWithDefault([
  ["REGULAR", "Regular"],
  ["SLIM", "Slim Fit"],
  ["RELAXED", "Relaxed Fit"],
  ["OVERSIZED", "Oversized"],
  ["ROUND-NECK", "Round Neck"],
  ["V-NECK", "V Neck"],
  ["COLLAR", "Collar"],
  ["FULL-SLEEVE", "Full Sleeve"],
  ["HALF-SLEEVE", "Half Sleeve"],
]);

const unitRows = rowsWithDefault(
  [
    ["PCS", "Pieces", "pcs", "Piece count"],
    ["NOS", "Numbers", "nos", "Number count"],
    ["KG", "Kilogram", "kg", "Weight in kilograms"],
    ["G", "Gram", "g", "Weight in grams"],
    ["MT", "Meter", "m", "Length in meters"],
    ["CM", "Centimeter", "cm", "Length in centimeters"],
    ["MM", "Millimeter", "mm", "Length in millimeters"],
    ["IN", "Inch", "in", "Length in inches"],
    ["FT", "Feet", "ft", "Length in feet"],
    ["YD", "Yard", "yd", "Length in yards"],
    ["LTR", "Litre", "l", "Volume in litres"],
    ["ML", "Millilitre", "ml", "Volume in millilitres"],
    ["ROLL", "Roll", "roll", "Roll quantity"],
    ["CONE", "Cone", "cone", "Cone quantity"],
    ["BOX", "Box", "box", "Box quantity"],
    ["CTN", "Carton", "ctn", "Carton quantity"],
    ["DOZ", "Dozen", "doz", "Dozen quantity"],
    ["PAIR", "Pair", "pair", "Pair quantity"],
    ["SET", "Set", "set", "Set quantity"],
    ["BDL", "Bundle", "bdl", "Bundle quantity"],
    ["BALE", "Bale", "bale", "Bale quantity"],
    ["PACK", "Pack", "pack", "Pack quantity"],
    ["HR", "Hour", "hr", "Time in hours"],
    ["DAY", "Day", "day", "Time in days"],
  ].map(([code, name, symbol, description]) => ({ code, name, symbol, description })),
  { symbol: "-" },
);

const hsnCodeRows = rowsWithDefault([
  {
    code: "5205",
    name: "Cotton yarn",
    description: "Cotton yarn other than sewing thread, containing 85% or more cotton by weight",
  },
  {
    code: "5208",
    name: "Light woven cotton fabrics",
    description:
      "Woven cotton fabrics containing 85% or more cotton, weighing not more than 200 g/m2",
  },
  {
    code: "5209",
    name: "Heavy woven cotton fabrics",
    description: "Woven cotton fabrics containing 85% or more cotton, weighing more than 200 g/m2",
  },
  {
    code: "5210",
    name: "Light mixed cotton fabrics",
    description: "Woven cotton fabrics mixed with man-made fibres, weighing not more than 200 g/m2",
  },
  {
    code: "5211",
    name: "Heavy mixed cotton fabrics",
    description: "Woven cotton fabrics mixed with man-made fibres, weighing more than 200 g/m2",
  },
  { code: "5212", name: "Other woven cotton fabrics", description: "Other woven cotton fabrics" },
  {
    code: "6001",
    name: "Pile knitted fabrics",
    description: "Pile fabrics including long pile and terry fabrics, knitted or crocheted",
  },
  {
    code: "6004",
    name: "Elastic knitted fabrics",
    description:
      "Knitted or crocheted fabrics wider than 30 cm with elastomeric yarn or rubber thread",
  },
  {
    code: "6005",
    name: "Warp knit fabrics",
    description: "Warp knit fabrics including galloon knit fabrics",
  },
  {
    code: "6006",
    name: "Other hosiery fabrics",
    description: "Other knitted or crocheted fabrics for hosiery and apparel",
  },
  {
    code: "6103",
    name: "Men's knitted trousers",
    description:
      "Men's or boys' suits, ensembles, jackets, trousers and shorts, knitted or crocheted",
  },
  {
    code: "6104",
    name: "Women's knitted trousers",
    description:
      "Women's or girls' suits, ensembles, jackets, dresses, skirts, trousers and shorts, knitted or crocheted",
  },
  {
    code: "6109",
    name: "Knitted T-shirts",
    description: "T-shirts, singlets and other vests, knitted or crocheted",
  },
  {
    code: "6110",
    name: "Knitted pullovers",
    description:
      "Jerseys, pullovers, cardigans, waistcoats and similar articles, knitted or crocheted",
  },
  {
    code: "6203",
    name: "Men's woven trousers",
    description: "Men's or boys' suits, ensembles, jackets, trousers and shorts, woven",
  },
  {
    code: "6204",
    name: "Women's woven trousers",
    description:
      "Women's or girls' suits, ensembles, jackets, dresses, skirts, trousers and shorts, woven",
  },
]);

const taxRows = rowsWithDefault(
  [
    {
      code: "GST0",
      name: "GST 0%",
      tax_type: "GST",
      rate_percent: 0,
      description: "GST without cess",
    },
    {
      code: "GST5",
      name: "GST 5%",
      tax_type: "GST",
      rate_percent: 5,
      description: "GST without cess",
    },
    {
      code: "GST12",
      name: "GST 12%",
      tax_type: "GST",
      rate_percent: 12,
      description: "GST without cess",
    },
    {
      code: "GST18",
      name: "GST 18%",
      tax_type: "GST",
      rate_percent: 18,
      description: "GST without cess",
    },
    {
      code: "GST24",
      name: "GST 24%",
      tax_type: "GST",
      rate_percent: 24,
      description: "GST without cess",
    },
    {
      code: "GST28",
      name: "GST 28%",
      tax_type: "GST",
      rate_percent: 28,
      description: "GST without cess",
    },
  ],
  { tax_type: "-", rate_percent: 0 },
);

export const productCommonSeeders = [
  createCommonMasterSeeder(commonDefinition("productGroups"), 70, productGroupRows),
  createCommonMasterSeeder(commonDefinition("productCategories"), 71, productCategoryRows),
  createCommonMasterSeeder(commonDefinition("productTypes"), 72, productTypeRows),
  createCommonMasterSeeder(commonDefinition("brands"), 73, brandRows),
  createCommonMasterSeeder(commonDefinition("colours"), 74, colourRows),
  createCommonMasterSeeder(commonDefinition("sizes"), 75, sizeRows),
  createCommonMasterSeeder(commonDefinition("styles"), 76, styleRows),
  createCommonMasterSeeder(commonDefinition("units"), 77, unitRows),
  createCommonMasterSeeder(commonDefinition("hsnCodes"), 78, hsnCodeRows),
  createCommonMasterSeeder(commonDefinition("taxes"), 79, taxRows),
] as const;
