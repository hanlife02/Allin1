"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Sun, Wrench, BookOpen, Settings, LayoutDashboard } from "lucide-react"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface SidebarUserPrefs {
  username?: string
  avatarDataUrl?: string
}

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [prefs] = useLocalStorage<SidebarUserPrefs>("allin1_preferences", {})
  const avatarFallback = (prefs.username || t.sidebar.title).charAt(0).toUpperCase()

  const navItems = [
    {
      title: t.sidebar.daily,
      href: "/daily",
      icon: Sun,
    },
    {
      title: t.sidebar.tools,
      href: "/tools",
      icon: Wrench,
    },
    {
      title: t.sidebar.research,
      href: "/research",
      icon: BookOpen,
    },
    {
      title: t.sidebar.settings,
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={t.sidebar.title}>
              <Link href="/daily">
                <Avatar className="size-8 rounded-full border border-border/60">
                  <AvatarImage src={prefs.avatarDataUrl || undefined} alt={prefs.username || t.sidebar.title} className="object-cover" />
                  <AvatarFallback className="bg-foreground text-background">
                    {prefs.avatarDataUrl ? avatarFallback : <LayoutDashboard className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{t.sidebar.title}</span>
                  <span className="text-xs text-muted-foreground">Personal Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
