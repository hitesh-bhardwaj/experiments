export interface ExpandingNavNestedLink {
    name: string;
    href: string;
}

export interface ExpandingNavSublink {
    name: string;
    href: string;
    nestedLinks?: ExpandingNavNestedLink[];
}

export interface ExpandingNavItem {
    name: string;
    href: string;
    sublinks?: ExpandingNavSublink[];
}

export const navigationData: ExpandingNavItem[] = [
    {
        name: "About", href: "#",
    },
    { name: "Work", href: "#" },
    {
        name: "Expertise",
        href: "#",
        sublinks: [
            {
                name: "Solutions", href: "#", nestedLinks: [
                    { name: "Design", href: "#" },
                    { name: "Development", href: "#" },
                    { name: "Marketing", href: "#" },
                    { name: "Strategy", href: "#" }
                ]
            },
            {
                name: "Industry", href: "#", nestedLinks: [
                    { name: "Fintech", href: "#" },
                    { name: "HealthCare", href: "#" },
                    { name: "Education", href: "#" },
                    { name: "Electronics", href: "#" }
                ]
            },
            {
                name: "Services",
                href: "#",

            }
        ]
    },
    { name: "Career", href: "#" },
    {
        name: "Resources", href: "#", sublinks: [
            { name: "Codepen", href: "#" },
            { name: "Greensock", href: "#" },
            {
                name: "Webflow",
                href: "#",
            }
        ]
    },
    { name: "Contact", href: "#" },
];
