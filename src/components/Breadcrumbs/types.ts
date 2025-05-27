import { RouterLinkProps } from 'vue-router'

export interface BreadcrumbItem {
  label: string
  route?: RouterLinkProps['to']
  onClick?: () => void
  [key: string]: any
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}
