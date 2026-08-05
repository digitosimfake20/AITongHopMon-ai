import type { LucideIcon } from 'lucide-react'
import { Calculator, ChartColumn, CircleDot, Shapes, Sparkles } from 'lucide-react'

export interface TopicClusterDef {
  id: string
  label: string
  icon: LucideIcon
  keywords: RegExp
}

export const TOPIC_CLUSTERS: TopicClusterDef[] = [
  {
    id: 'algebra',
    label: 'Đại số',
    icon: Calculator,
    keywords:
      /phân thức|đa thức|phương trình|bất phương trình|biểu thức|nhân|chia|điều kiện|x\s*=|tách phần|quy đồng|rút gọn|bất đẳng/i,
  },
  {
    id: 'geometry',
    label: 'Hình học',
    icon: Shapes,
    keywords:
      /hình|tam giác|vuông|diện tích|thể tích|góc|đường tròn|đường thẳng|đa giác|lượng giác|đồng dạng/i,
  },
  {
    id: 'numbers',
    label: 'Số học',
    icon: CircleDot,
    keywords: /số nguyên|số thực|lũy thừa|căn|ước|bội|thập phân|phần trăm/i,
  },
  {
    id: 'stats',
    label: 'Thống kê & Xác suất',
    icon: ChartColumn,
    keywords: /thống kê|xác suất|biểu đồ|trung bình|tần suất|mẫu số/i,
  },
]

const OTHER_CLUSTER: TopicClusterDef = {
  id: 'other',
  label: 'Chủ đề khác',
  icon: Sparkles,
  keywords: /.*/,
}

export function inferTopicCluster(topic: string): string {
  const normalized = topic.trim()
  for (const cluster of TOPIC_CLUSTERS) {
    if (cluster.keywords.test(normalized)) return cluster.id
  }
  return OTHER_CLUSTER.id
}

export function getTopicClusterDef(clusterId: string): TopicClusterDef {
  return TOPIC_CLUSTERS.find((c) => c.id === clusterId) ?? OTHER_CLUSTER
}

export type MasteryStatus = 'MASTERED' | 'PROGRESSING' | 'GAP'

export function masteryStatusFromPercent(percent: number): MasteryStatus {
  if (percent >= 80) return 'MASTERED'
  if (percent >= 50) return 'PROGRESSING'
  return 'GAP'
}

export function masteryStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case 'MASTERED':
      return 'Tốt'
    case 'PROGRESSING':
      return 'Khá'
    case 'GAP':
      return 'Lỗ hổng lớn'
  }
}
