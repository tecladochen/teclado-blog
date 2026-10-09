// solarlunar 3.1 exposes its JS exports without a corresponding types condition.
// Keep the conversion methods used here typed until the package fixes its exports.
declare module 'solarlunar' {
  interface Conversion {
    cYear: number
    cMonth: number
    cDay: number
    isLeap: boolean
    monthCn: string
    dayCn: string
  }

  const solarLunar: {
    solar2lunar: (year: number, month: number, day: number) => Conversion | -1
    lunar2solar: (year: number, month: number, day: number, isLeapMonth?: boolean) => Conversion | -1
  }
  export default solarLunar
}
