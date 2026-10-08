export interface TravelPlace {
  /** 城市。只记得省或国家时可以不写 */
  city?: string
  /** 省。写了已知城市时可以省略，由城市反推 */
  province?: string
  /** 省略时视为中国 */
  country?: string
  /** 年月，例如 2024-06 */
  visited?: string
  /** 一句短记 */
  note?: string
  /** 站内文章路径，例如 /posts/leave-hometown/ */
  post?: string
}

/**
 * 去过的地方。省和城市重复时，地图只亮一次。
 * 下面是示例，换成你自己的行程即可。
 * post 指向站内文章；这里先链到现有的一篇，方便看链接长什么样。
 */
export const travels: TravelPlace[] = [
  {
    city: '杭州',
    province: '浙江',
    visited: '2024-06',
    note: '雨停之后，沿着西湖走到断桥。',
    post: '/posts/leave-hometown/',
  },
  {
    city: '武汉',
    visited: '2024-03',
    note: '江风很大，黄鹤楼只远远看了一眼。',
  },
  {
    province: '安徽',
    visited: '2023-11',
    note: '在宏村待了一个下午，没再往山里走。',
  },
]
