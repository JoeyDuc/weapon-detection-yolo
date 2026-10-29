import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Info } from 'lucide-react'
import { getSummary, getTimeline, getDistribution } from '../services/api'
import { Card, PageIntro, SectionHeading, ErrorState, Badge } from '../components/shared/Common'
import { Metrics } from '../components/dashboard/Metrics'
import { ActivityChart, DistributionChart } from '../components/charts/ActivityChart'
export default function Analytics() {
  const [days, setDays] = useState(30)
  const summary = useQuery({ queryKey: ['summary', days], queryFn: () => getSummary(days) }),
    timeline = useQuery({ queryKey: ['timeline', days], queryFn: () => getTimeline(days) }),
    distribution = useQuery({
      queryKey: ['distribution', days],
      queryFn: () => getDistribution(days),
    })
  return (
    <>
      <PageIntro
        title="Analytics"
        description="A little perspective. A better understanding."
        action={
          <select
            aria-label="Analytics date range"
            value={days}
            onChange={(e) => setDays(+e.target.value)}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />
      <div className="analytics-note">
        <Info size={16} />
        <span>
          Workspace activity describes what was analyzed. Model accuracy is measured separately on
          held-out test data.
        </span>
      </div>
      {(summary.isError || timeline.isError || distribution.isError) && (
        <ErrorState
          error={summary.error || timeline.error || distribution.error}
          retry={() => {
            summary.refetch()
            timeline.refetch()
            distribution.refetch()
          }}
        />
      )}
      <Metrics summary={summary.data} pending={summary.isPending} />
      <Card className="analytics-main">
        <SectionHeading
          title="Detection trends"
          description="Saved object indications over time."
          action={
            <Badge tone="purple">
              <BarChart3 size={13} />
              Actual workspace data
            </Badge>
          }
        />
        <ActivityChart data={timeline.data || []} height={270} />
      </Card>
      <div className="analytics-grid">
        <Card>
          <SectionHeading
            title="Object distribution"
            description="Knife and gun indications saved in your workspace."
          />
          <DistributionChart data={distribution.data?.categories || []} />
        </Card>
        <Card>
          <SectionHeading
            title="Confidence distribution"
            description="Prediction confidence, grouped into 20% intervals."
          />
          <DistributionChart data={distribution.data?.confidence || []} />
        </Card>
        <Card>
          <SectionHeading
            title="Analysis sources"
            description="Completed and attempted analyses by input type."
          />
          <DistributionChart data={distribution.data?.sources || []} />
        </Card>
        <Card>
          <SectionHeading
            title="Alert frequency"
            description="Events that met your confirmation and cooldown rules."
          />
          <ActivityChart data={timeline.data || []} metric="alerts" height={210} />
        </Card>
      </div>
      <Card className="analytics-main">
        <SectionHeading
          title="Analysis activity"
          description="All analysis sessions, including attempts that could not complete."
        />
        <ActivityChart data={timeline.data || []} metric="analyses" height={220} />
      </Card>
      <p className="page-footnote">
        Live and video records contain confirmed, cooldown-limited events; image records contain
        each detected object. Counts are not directly comparable across sources.
      </p>
    </>
  )
}
