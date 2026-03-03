"use client"

import { useState } from "react"
import { BrainCircuit, Search, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useLocale } from "@/lib/i18n"

interface SearchResult {
  id: string
  title: string
  authors: string
  year: number
  journal: string
  relevance: number
}

const mockResults: SearchResult[] = [
  { id: "1", title: "Language Models are Few-Shot Learners", authors: "Brown et al.", year: 2020, journal: "NeurIPS", relevance: 95 },
  { id: "2", title: "Training language models to follow instructions", authors: "Ouyang et al.", year: 2022, journal: "NeurIPS", relevance: 89 },
  { id: "3", title: "Scaling Laws for Neural Language Models", authors: "Kaplan et al.", year: 2020, journal: "arXiv", relevance: 82 },
]

export function AiSearchCard() {
  const { t } = useLocale()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    setHasSearched(true)
    setTimeout(() => {
      setResults(mockResults)
      setSearching(false)
    }, 1500)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{t.research.aiSearch.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder={t.research.aiSearch.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button size="sm" className="h-8" onClick={handleSearch} disabled={searching}>
            {searching ? t.research.aiSearch.searching : t.research.aiSearch.search}
          </Button>
        </div>

        {searching && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t.research.aiSearch.noResults}</p>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t.research.aiSearch.results}: {results.length}
            </p>
            {results.map((result) => (
              <div key={result.id} className="flex items-start justify-between gap-2 rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-snug">{result.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {result.authors} · {result.year} · {result.journal}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  {t.research.aiSearch.addToIndex}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!hasSearched && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <BrainCircuit className="h-8 w-8 mb-2" strokeWidth={1} />
            <p className="text-sm">{t.research.aiSearch.placeholder}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
