'use client'
import type { DiagnosticReport, GeneticData } from '@/lib/types'
import { GeneticOverview } from './GeneticOverview'
import { GeneticCategoryGrid } from './GeneticCategoryGrid'
import { GeneticRecommendations } from './GeneticRecommendations'
import { GeneticGroceryList } from './GeneticGroceryList'
import { GeneticFollowupBloodwork } from './GeneticFollowupBloodwork'

const SURFACE = '#0F1827', BORDER = '#1A2A40', TEXT_MUTED = '#8A9AB8', TEXT_HINT = '#4A5A7A'

interface Props {
  geneticData: GeneticData | null | undefined
  report: DiagnosticReport
}

export function GeneticsClientView({ geneticData, report }: Props) {
  if (!geneticData) {
    return (
      <div style={{
        backgroundColor: SURFACE, border: `1px solid ${BORDER}`,
        borderRadius: 12, padding: '40px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginBottom: 8 }}>
          Your genetics report is being prepared.
        </div>
        <div style={{ fontSize: 12, color: TEXT_HINT }}>
          Your coach will publish it shortly.
        </div>
      </div>
    )
  }

  return (
    <div>
      <GeneticOverview overview={geneticData.overview} topPriorities={geneticData.top_priorities} />
      <GeneticCategoryGrid categoryNotes={geneticData.category_notes} />
      <GeneticRecommendations recommendations={geneticData.recommendations} />
      <GeneticGroceryList items={geneticData.grocery_list} />
      <GeneticFollowupBloodwork markers={geneticData.followup_bloodwork} />
    </div>
  )
}
