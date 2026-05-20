import type { NavigationType } from "@/types"

export const navigationsData: NavigationType[] = [
  {
    title: "Pharmacy Analytics",
    items: [
      {
        title: "Overview",
        href: "/",
        iconName: "LayoutDashboard",
      },
      {
        title: "Products",
        href: "/products",
        iconName: "Pill",
      },
      {
        title: "Margin Risk",
        href: "/margin-risk",
        iconName: "TriangleAlert",
      },
    ],
  },
]
