'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Shield } from 'lucide-react'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/deposit', label: 'Protect Position' },
  { href: '/positions', label: 'All Positions' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-500" />
          <span className="text-lg font-bold text-white">ILex Protocol</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <ConnectButton />
      </div>
    </header>
  )
}
