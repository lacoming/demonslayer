import { Badge } from "@/components/ui/badge"
import { type Rank } from "@/config/game"

interface RankBadgeProps {
  rank: Rank
  className?: string
}

export function RankBadge({ rank, className }: RankBadgeProps) {
  return (
    <Badge variant="secondary" className={className}>
      {rank}
    </Badge>
  )
}
