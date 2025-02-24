export interface FireDoorSurvey {
  id: string
  created_at: string
  location_name: string
  location_id: string
  door_type: string
  installation_type: string
  manufacturer: string
  doorset_number: string
  date_installed: string
  fire_rating: string
  door_closer_manufacturer: string
  num_hinges: number
  hardware_supplier: string
  has_standard_gaps: boolean
  gaps_notes: string
  leaf_dimensions: {
    width: number
    height: number
    thickness: number
    has_vision_panel: boolean
    vision_panel_material: string
    vision_panel: {
      width: number
      height: number
    }
  }
  inspection_results: {
    door_leaf: { status: string, notes: string }
    door_frame: { status: string, notes: string }
    vision_panel: { status: string, notes: string }
    intumescent_seal: { status: string, notes: string }
    smoke_seal: { status: string, notes: string }
    hinges: { status: string, notes: string }
    door_closer: { status: string, notes: string }
    hardware: { status: string, notes: string }
    door_tag: { status: string, notes: string }
    door_indicator: { status: string, notes: string }
  }
  photos: {
    file_path: string
    description: string
    timestamp: string
  }[]
  additional_notes: string
  user_id: string
} 