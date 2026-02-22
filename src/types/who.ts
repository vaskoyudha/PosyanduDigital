export interface LMSRow {
  day: number
  L: number
  M: number
  S: number
}

export interface WfhLMSRow {
  height: number // height in cm (e.g. 45.0, 45.1, ...)
  L: number
  M: number
  S: number
}

export type WHOIndicator = 'wfa' | 'lhfa' | 'wfh'
export type WHOSex = 'boys' | 'girls'

export interface ZScoreResult {
  zscore: number
  restricted: boolean // true if linearization (restricted Z-score) was applied
}

// Indonesian nutrition classification types (Permenkes 2/2020)
export type BBUStatus = 'gizi_buruk' | 'gizi_kurang' | 'gizi_baik' | 'gizi_lebih'
export type TBUStatus = 'sangat_pendek' | 'pendek' | 'normal' | 'tinggi'
export type BBTBStatus = 'gizi_buruk' | 'gizi_kurang' | 'gizi_baik' | 'gizi_lebih' | 'obesitas'

export type MeasurementType = 'PB' | 'TB' // PB = recumbent (panjang badan), TB = standing (tinggi badan)

export interface NutritionStatus {
  bb_u: BBUStatus | null   // weight-for-age classification
  tb_u: TBUStatus | null   // height-for-age classification
  bb_tb: BBTBStatus | null  // weight-for-height classification
}

export interface NutritionClassification extends NutritionStatus {
  zscore_bb_u: number | null
  zscore_tb_u: number | null
  zscore_bb_tb: number | null
}

export type NaikStatus = 'N' | 'T' | 'O'

export interface WHOChartPoint {
  ageMonths: number
  sd_neg3: number
  sd_neg2: number
  sd_neg1: number
  sd_0: number
  sd_pos1: number
  sd_pos2: number
  sd_pos3: number
}
