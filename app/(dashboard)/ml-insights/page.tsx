"use client"
// Force Hot Reload 2
import { useEffect, useState } from "react"
import { Topbar } from "@/components/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, TrendingUp, AlertTriangle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts"

interface Prediction {
  experiment_id: string
  date: string
  ensemble_risk: number
  lgb_risk: number
  sarima_risk: number
  risk_tier: string
}

interface Forecast {
  step: number
  ensemble_risk: number
  lgb_risk: number
  sarima_risk: number
  risk_tier: string
}

interface Explanation {
  feature: string
  mean_abs_shap: number
  mean_shap: number
  rank: number
}

export default function MLInsightsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [explanations, setExplanations] = useState<Explanation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [predRes, forecastRes, explRes] = await Promise.all([
          fetch("/api/ml/predict?limit=15"),
          fetch("/api/ml/forecast?steps=5"),
          fetch("/api/ml/explain")
        ])

        if (!predRes.ok || !forecastRes.ok || !explRes.ok) {
          throw new Error("One or more ML API endpoints failed to respond.")
        }

        setPredictions((await predRes.json()).reverse())
        setForecasts(await forecastRes.json())
        setExplanations((await explRes.json()).slice(0, 5))
      } catch (err: any) {
        setError(err.message || "Failed to load ML data")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "LOW": return "bg-success/10 text-success border-success/20"
      case "MEDIUM": return "bg-warning/10 text-warning border-warning/20"
      case "HIGH": return "bg-destructive/10 text-destructive border-destructive/20"
      case "CRITICAL": return "bg-destructive/20 text-destructive border-destructive"
      default: return "bg-muted text-muted-foreground"
    }
  }

  // Format data for chart
  const chartData = predictions.map(p => ({
    time: new Date(p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Risk: p.ensemble_risk,
    LGB: p.lgb_risk,
    SARIMA: p.sarima_risk,
    tier: p.risk_tier
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar 
        title="ML Insights" 
        description="Machine Learning Risk Predictions and SHAP Explanations"
      />
      
      <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {error && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Error Loading Data</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-destructive">{error}</CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {/* Main Time Series Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Risk Trend (Latest 15)
                    </CardTitle>
                    <CardDescription>Ensemble risk predictions over recent experiments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {loading ? (
                    <div className="flex h-full items-center justify-center">Loading...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                        <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Risk" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="LGB" stroke="#82ca9d" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="SARIMA" stroke="#ffc658" strokeDasharray="5 5" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Global SHAP Explanations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Global Feature Importance
                </CardTitle>
                <CardDescription>Top features driving risk globally</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-4 text-center">Loading...</div>
                ) : (
                  <div className="space-y-4">
                    {explanations.map((exp, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate max-w-[150px]" title={exp.feature}>
                            {exp.feature.replace(/_/g, ' ')}
                          </span>
                          <span className="text-muted-foreground">{exp.mean_abs_shap.toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, (exp.mean_abs_shap / explanations[0].mean_abs_shap) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Future Forecast */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Future Risk Forecast (SARIMA)</CardTitle>
                <CardDescription>Predicted risk for the next 5 intervals based on current trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-5">
                  {loading ? (
                    <div className="col-span-5 py-4 text-center">Loading...</div>
                  ) : forecasts.length > 0 ? (
                    forecasts.map((f, i) => (
                      <div key={i} className="rounded-lg border border-border p-4 flex flex-col items-center gap-2">
                        <span className="text-sm text-muted-foreground">Step +{f.step}</span>
                        <span className="text-2xl font-bold">{f.ensemble_risk}%</span>
                        <Badge variant="outline" className={getTierColor(f.risk_tier)}>
                          {f.risk_tier}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-5 py-4 text-center text-muted-foreground">No forecast available</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
