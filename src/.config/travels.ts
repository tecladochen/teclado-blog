export interface TravelPlace {
  /** 城市。只记得省或国家时可以不写 */
  city?: string
  /** 省。写了已知城市时可以省略，由城市反推 */
  province?: string
  /** 省略时视为中国 */
  country?: string
  /** 年月，例如 2024-06 */
  visited?: string
  /** 具体地点，地图仍按 city 所属的地级市归类 */
  place?: string
  kind?: 'birth' | 'residence' | 'visit'
  /** 居住结束年份；present 表示至今 */
  until?: string
  /** 城市库只收录地级市；县级市、景区等查不到时，手动补经纬度，同时写上 province */
  lng?: number
  lat?: number
}

/**
 * 去过的地方。省和城市重复时，地图只亮一次。
 */
export const travels: TravelPlace[] = [
  { city: '台州', place: '临海市', visited: '2001', kind: 'birth' },
  { city: '嘉兴', place: '南湖区', visited: '2019', until: '2024', kind: 'residence' },
  { city: '杭州', place: '萧山区', visited: '2024', until: 'present', kind: 'residence' },
  { city: '嘉兴', place: '乌镇', visited: '2023-10' },
  { city: '金华', visited: '2025-07' },
  { city: '南京', visited: '2025-10' },
  { city: '南昌', visited: '2024-04' },
  { city: '澳门', visited: '2019-07' },
  { city: '深圳', visited: '2019-07' },
  { city: '珠海', visited: '2019-07' },
  { city: '武汉', visited: '2024-07' },
  { city: '合肥', visited: '2025-07' },
  { city: '上海', visited: '2019-10' },
]
