import { RouterLinkProps } from 'vue-router'

export interface BreadcrumbLinkItem {
  /** Text shown for the breadcrumb item */
  label: string

  /** Route location used when the item is a link */
  route?: RouterLinkProps['to']

  /** Href used when the item is a plain anchor */
  href?: string

  /** Click handler for non-router breadcrumb items */
  onClick?: () => void

  /** Allows passing additional custom fields */
  [key: string]: any
}

export interface BreadcrumbDropdownItem {
  /** Renders a dropdown trigger instead of a link */
  type: 'dropdown'

  /** Options shown in the dropdown menu */
  items: BreadcrumbLinkItem[]

  /** Optional fallback label when no option matches the current route */
  label?:
    | string
    | ((
        item: BreadcrumbDropdownItem,
        activeOption?: BreadcrumbLinkItem,
      ) => string)

  /** Allows passing additional custom fields */
  [key: string]: any
}

export type BreadcrumbItem = BreadcrumbLinkItem | BreadcrumbDropdownItem

export interface BreadcrumbsProps {
  /** Ordered list of breadcrumb items */
  items: BreadcrumbItem[]
}
