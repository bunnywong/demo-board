import _ from 'lodash'

export const getScheduleMonthly = (data) => {
  const schdule = _.sortBy(data, 'startedAt')
  return _.groupBy(schdule, (item) => item.startedAt.slice(0, 7))
}
export const getScheduleDaily = (data) => {
  const _data = getScheduleMonthly(data)
  return Object.entries(_data).reduce((acc, [month, units]) => {
    acc[month] = units.reduce((days, unit) => {
      const date = unit.startedAt.split('T')[0]
      days[date] = days[date] || []
      days[date].push(unit)
      return days
    }, {})
    return acc
  }, {})
}
