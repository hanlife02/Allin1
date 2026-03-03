"use client"

import { useState } from "react"
import { Activity, Circle, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface MonitorTarget {
  id: string
  name: string
  url: string
  status: "online" | "offline" | "unknown"
  lastCheck: string
  responseTime: number | null
}

const defaultTargets: MonitorTarget[] = [
  {
    id: "1",
    name: "School Portal",
    url: "https://portal.example.edu",
    status: "online",
    lastCheck: "2026-03-01 14:30",
    responseTime: 234,
  },
  {
    id: "2",
    name: "Library System",
    url: "https://lib.example.edu",
    status: "online",
    lastCheck: "2026-03-01 14:30",
    responseTime: 156,
  },
  {
    id: "3",
    name: "Course Platform",
    url: "https://course.example.edu",
    status: "offline",
    lastCheck: "2026-03-01 14:28",
    responseTime: null,
  },
]

export function ApMonitorCard() {
  const { t } = useLocale()
  const [targets, setTargets] = useLocalStorage<MonitorTarget[]>("allin1_monitors", defaultTargets)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTarget, setNewTarget] = useState({ name: "", url: "" })

  function addTarget() {
    if (!newTarget.name.trim() || !newTarget.url.trim()) return
    setTargets((prev) => [
      ...prev,
      {
        ...newTarget,
        id: Date.now().toString(),
        status: "unknown" as const,
        lastCheck: new Date().toLocaleString(),
        responseTime: null,
      },
    ])
    setNewTarget({ name: "", url: "" })
    setDialogOpen(false)
  }

  function deleteTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id))
  }

  const statusStyles: Record<string, string> = {
    online: "text-foreground",
    offline: "text-muted-foreground/40",
    unknown: "text-muted-foreground/60",
  }

  const statusLabels: Record<string, string> = {
    online: t.tools.apMonitor.online,
    offline: t.tools.apMonitor.offline,
    unknown: t.tools.apMonitor.unknown,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{t.tools.apMonitor.title}</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t.tools.apMonitor.addTarget}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.tools.apMonitor.addTarget}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.name}</Label>
                  <Input
                    value={newTarget.name}
                    onChange={(e) => setNewTarget((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t.tools.apMonitor.url}</Label>
                  <Input
                    value={newTarget.url}
                    onChange={(e) => setNewTarget((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={addTarget}>{t.common.add}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {targets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.tools.apMonitor.noTargets}</p>
        ) : (
          <div className="space-y-2">
            {targets.map((target) => (
              <div
                key={target.id}
                className="group flex items-center gap-3 rounded-md border p-3 transition-colors"
              >
                <Circle
                  className={`h-2.5 w-2.5 shrink-0 fill-current ${statusStyles[target.status]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{target.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{target.url}</span>
                    <span>·</span>
                    <span>{statusLabels[target.status]}</span>
                    {target.responseTime !== null && (
                      <>
                        <span>·</span>
                        <span>{target.responseTime}ms</span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteTarget(target.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
