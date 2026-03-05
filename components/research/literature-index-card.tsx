"use client"

import { useState } from "react"
import { BookMarked, Plus, Search, Trash2, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useLocale } from "@/lib/i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"

interface Literature {
  id: string
  title: string
  authors: string
  year: number
  journal: string
  tags: string[]
}

const defaultLiterature: Literature[] = [
  {
    id: "1",
    title: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    journal: "NeurIPS",
    tags: ["Transformer", "NLP"],
  },
  {
    id: "2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers",
    authors: "Devlin et al.",
    year: 2019,
    journal: "NAACL",
    tags: ["BERT", "NLP"],
  },
  {
    id: "3",
    title: "Deep Residual Learning for Image Recognition",
    authors: "He et al.",
    year: 2016,
    journal: "CVPR",
    tags: ["ResNet", "CV"],
  },
]

export function LiteratureIndexCard() {
  const { t } = useLocale()
  const [literature, setLiterature] = useLocalStorage<Literature[]>("allin1_literature", defaultLiterature)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newLit, setNewLit] = useState({ title: "", authors: "", year: 2026, journal: "", tags: "" })

  const filtered = literature.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  function addLiterature() {
    if (!newLit.title.trim()) return
    setLiterature((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: newLit.title,
        authors: newLit.authors,
        year: newLit.year,
        journal: newLit.journal,
        tags: newLit.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    ])
    setNewLit({ title: "", authors: "", year: 2026, journal: "", tags: "" })
    setDialogOpen(false)
  }

  function deleteLiterature(id: string) {
    setLiterature((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">{t.research.literatureIndex.title}</CardTitle>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
                <span className="sr-only">{t.research.literatureIndex.addLiterature}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.research.literatureIndex.addLiterature}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t.research.literatureIndex.paperTitle}</Label>
                  <Input value={newLit.title} onChange={(e) => setNewLit((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>{t.research.literatureIndex.authors}</Label>
                  <Input value={newLit.authors} onChange={(e) => setNewLit((p) => ({ ...p, authors: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>{t.research.literatureIndex.year}</Label>
                    <Input
                      type="number"
                      value={newLit.year}
                      onChange={(e) => setNewLit((p) => ({ ...p, year: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t.research.literatureIndex.journal}</Label>
                    <Input value={newLit.journal} onChange={(e) => setNewLit((p) => ({ ...p, journal: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>{t.research.literatureIndex.tags}</Label>
                  <Input
                    value={newLit.tags}
                    onChange={(e) => setNewLit((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="tag1, tag2, ..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.common.cancel}
                </Button>
                <Button onClick={addLiterature}>{t.common.add}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder={t.research.literatureIndex.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.research.literatureIndex.noLiterature}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((lit) => (
              <div key={lit.id} className="group rounded-md border p-3 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-snug">{lit.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {lit.authors} · {lit.year} · {lit.journal}
                    </div>
                    {lit.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {lit.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => deleteLiterature(lit.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
