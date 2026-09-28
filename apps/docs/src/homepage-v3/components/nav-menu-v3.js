import { navCategoryColumns, navDocsItems } from "@/utils/Links";

// hrefs and icons keep living in utils/Links - the one place the classic navbar
// reads them from too. v3 only re-groups those same entries into the labelled
// columns its panel draws, so a link never has to be kept in sync twice.
const BY_LABEL = new Map(
  [...navCategoryColumns.flat(), ...navDocsItems].map((item) => [
    item.label,
    item,
  ])
);

// A label that no longer exists upstream drops out of its column rather than
// rendering an undefined row.
const pick = (...labels) => labels.map((label) => BY_LABEL.get(label)).filter(Boolean);

export const NAV_MENUS_V3 = {
  categories: {
    columns: [
      {
        title: "Browse",
        items: pick("All Effects", "Featured"),
      },
      {
        title: "By type",
        items: pick(
          "Text",
          "Backgrounds",
          "Buttons",
          "Carousels",
          "Components",
          "Navigation"
        ),
      },
      {
        title: "In motion",
        items: pick("Scroll", "Cursor", "Transitions", "Loaders", "WebGL"),
      },
      
    ],
  },
  docs: {
    columns: [
      {
        title: "Get started",
        items: pick("Introduction", "Installation", "CLI","MCP"),
      },
      {
        title: "Reference",
        items: pick("Dependencies", "License"),
      },
    ],
  },
};
