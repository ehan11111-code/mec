import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MEC Operations Portal',
  description: 'MEC operational command center — orders, approvals, warehouse, logistics, finance and supplier planning. Built by Jarvis AI Agency.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
