"use client"

import { useState } from "react"
import { FileText, Upload, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useLocale } from "@/lib/i18n"

interface Summary {
  summary: string
  keyFindings: string[]
  methodology: string
  conclusions: string
}

const mockSummary: Summary = {
  summary:
    "This paper introduces the Transformer architecture, which relies entirely on self-attention mechanisms and dispensing with recurrence and convolutions. The model achieves state-of-the-art results on machine translation benchmarks while being significantly more parallelizable.",
  keyFindings: [
    "Self-attention can replace recurrence for sequence modeling",
    "Multi-head attention improves model expressiveness",
    "Positional encodings enable order-awareness without recurrence",
  ],
  methodology: "The authors propose a novel encoder-decoder architecture using stacked self-attention and point-wise fully connected layers, evaluated on WMT 2014 English-to-German and English-to-French translation tasks.",
  conclusions: "The Transformer establishes new state-of-the-art BLEU scores while requiring significantly less training time compared to recurrent and convolutional models.",
}

export function AiSummaryCard() {
  const { t } = useLocale()
  const [file, setFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<Summary | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setGenerating(true)
      setResult(null)
      setTimeout(() => {
        setResult(mockSummary)
        setGenerating(false)
      }, 2000)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">{t.research.aiSummary.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center transition-colors hover:bg-muted/50">
          <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium">{t.research.aiSummary.upload}</p>
            <p className="text-xs text-muted-foreground">{t.research.aiSummary.uploadHint}</p>
          </div>
          {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileChange} />
        </label>

        {generating && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.research.aiSummary.generating}</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}

        {result && !generating && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1.5">{t.research.aiSummary.summary}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1.5">{t.research.aiSummary.keyFindings}</h3>
              <ul className="space-y-1">
                {result.keyFindings.map((finding, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
                    {finding}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1.5">{t.research.aiSummary.methodology}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.methodology}</p>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium mb-1.5">{t.research.aiSummary.conclusions}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{result.conclusions}</p>
            </div>

            <Button variant="outline" size="sm" className="w-full">
              <Download className="mr-2 h-3.5 w-3.5" />
              {t.research.aiSummary.export}
            </Button>
          </div>
        )}

        {!file && !generating && !result && (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2" strokeWidth={1} />
            <p className="text-sm">{t.research.aiSummary.noFile}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
