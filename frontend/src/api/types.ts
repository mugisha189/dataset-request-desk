export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type Role = 'client' | 'operator' | 'admin'
export type Quality = 'good' | 'usable' | 'bad'
export type RequestStatus = 'submitted' | 'in_progress' | 'delivered' | 'accepted' | 'rejected'
export type ExportStatus = 'pending' | 'running' | 'done' | 'failed'

export interface AuthUser {
  user_id: string
  role: Role
  name: string
}

export interface User {
  id: string
  email: string
  name: string
  organisation: string | null
  role: Role
  is_active: boolean
  created_at: string
}

export interface Episode {
  id: string
  episode_id: string
  robot_id: string
  task_name: string
  recorded_at: string
  duration_seconds: number
  operator_name: string
  quality: Quality
  is_assigned: boolean
}

export interface ImportReportRow {
  row_number: number
  episode_id: string | null
  outcome: 'imported' | 'skipped' | 'duplicate'
  reason: string | null
}

export interface ImportResult {
  batch_id: string
  total_rows: number
  imported_count: number
  skipped_count: number
  duplicate_count: number
  details: ImportReportRow[]
}

export interface StatusEvent {
  from_status: RequestStatus | null
  to_status: RequestStatus
  actor_id: string
  actor_name: string | null
  created_at: string
}

export interface Assignment {
  id: string
  episode: Episode
  export_status: ExportStatus
  export_attempts: number
  export_error: string | null
  created_at: string
}

export interface DatasetRequest {
  id: string
  client_id: string
  client_name: string | null
  task_name: string
  episodes_requested: number
  deadline: string
  notes: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  assigned_count: number
}

export interface DatasetRequestDetail extends DatasetRequest {
  status_events: StatusEvent[]
  assignments: Assignment[]
}

export interface EpisodesPerDayPerRobot {
  day: string
  robot_id: string
  count: number
}

export interface RequestsByStatus {
  status: RequestStatus
  count: number
}

export interface TopTask {
  task_name: string
  good_episode_count: number
}

export interface QualityBreakdown {
  quality: Quality
  count: number
}

export interface OperatorProductivity {
  operator_name: string
  count: number
}

export interface RequestsPerDay {
  day: string
  count: number
}

export interface RobotDuration {
  robot_id: string
  avg_duration_seconds: number
}

export interface ClientRequestCount {
  client_name: string
  count: number
}

export interface EpisodeFunnel {
  total: number
  assigned: number
  unassigned: number
}

export interface Analytics {
  episode_funnel: EpisodeFunnel
  episodes_per_day_per_robot: EpisodesPerDayPerRobot[]
  requests_by_status: RequestsByStatus[]
  median_submitted_to_delivered_hours: number | null
  top_tasks_by_good_episodes: TopTask[]
  quality_breakdown: QualityBreakdown[]
  operator_productivity: OperatorProductivity[]
  requests_created_per_day: RequestsPerDay[]
  avg_duration_by_robot: RobotDuration[]
  clients_by_requests: ClientRequestCount[]
}
