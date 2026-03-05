"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Wrench, BookOpen, Settings, LayoutDashboard, ChevronRight, Activity, GraduationCap, CalendarDays } from "lucide-react"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface SidebarUserPrefs {
  username?: string
  avatarDataUrl?: string
}

export function AppSidebar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const [prefs] = useLocalStorage<SidebarUserPrefs>("allin1_preferences", {})
  const [dailyOpen, setDailyOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const avatarFallback = (prefs.username || t.sidebar.title).charAt(0).toUpperCase()

  useEffect(() => {
    if (pathname.startsWith("/daily")) {
      setDailyOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith("/tools")) {
      setToolsOpen(true)
    }
  }, [pathname])

  const navItems = [
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
              <Link href="/daily/dashboard">
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
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/daily")}
                  tooltip={t.sidebar.daily}
                  onClick={() => setDailyOpen((prev) => !prev)}
                  aria-expanded={dailyOpen}
                >
                  <LayoutDashboard className="size-4" />
                  <span>{t.sidebar.daily}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden",
                      dailyOpen && "rotate-90",
                    )}
                  />
                </SidebarMenuButton>
                {dailyOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/daily/dashboard")}
                      >
                        <Link href="/daily/dashboard">
                          <LayoutDashboard className="size-4" />
                          <span>{t.daily.dashboard.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/daily/schedule")}
                      >
                        <Link href="/daily/schedule">
                          <CalendarDays className="size-4" />
                          <span>{t.daily.schedule.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith("/tools")}
                  tooltip={t.sidebar.tools}
                  onClick={() => setToolsOpen((prev) => !prev)}
                  aria-expanded={toolsOpen}
                >
                  <Wrench className="size-4" />
                  <span>{t.sidebar.tools}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden",
                      toolsOpen && "rotate-90",
                    )}
                  />
                </SidebarMenuButton>
                {toolsOpen && (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/tools/ap-monitor")}
                      >
                        <Link href="/tools/ap-monitor">
                          <Activity className="size-4" />
                          <span>{t.tools.apMonitor.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.startsWith("/tools/credit-audit")}
                      >
                        <Link href="/tools/credit-audit">
                          <GraduationCap className="size-4" />
                          <span>{t.tools.creditAudit.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
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
