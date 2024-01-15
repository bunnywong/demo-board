import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import _ from 'lodash'
// custom
import _dataCaregiver from '../../public/data-caregiver.json'
import { getScheduleDaily } from '../utils'

const IndexPage = () => {
  const [schedule, setSchedule] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])

  // utils:
  // bulk process with `monthString`, otherwise single's `item`
  const updateStatus = ({ monthString, item, status }) => {
    const _schedule = _.flattenDeep(
      _.map(schedule, (month) =>
        _.filter(month, (slots) => _.some(slots, () => true))
      )
    )
    const scheduleUpdated = _.forEach(_schedule, (entry) => {
      const matchMonth = entry.startedAt.slice(0, 7) === monthString
      const isPending = entry.status === 'PENDING'
      const matchItem =
        _.size(item) &&
        entry.startedAt === item.startedAt &&
        entry.endedAt === item.endedAt &&
        entry.userId === item.userId
      if (isPending && (matchMonth || matchItem)) {
        entry.status = status
      }
    })
    setSchedule(getScheduleDaily(scheduleUpdated))
  }
  // handle header checkbox update
  const handleChangeBulk = (e, item) => {
    if (item.status !== 'PENDING') {
      return
    }
    const isChecked = e.target.checked
    // 1.1 checkbox checked
    if (isChecked) {
      // merge current checked item
      const itemsUpdated = [...selectedItems]
      itemsUpdated.push(item)
      setSelectedItems(_.uniqWith(itemsUpdated, _.isEqual))
      return
    }
    // 1.2 checkbox unchecked
    const itemUpdated = _.filter(selectedItems, (v) => {
      const start = v.startedAt !== item.startedAt
      const end = v.endedAt !== item.endedAt
      const userId = v.userId !== item.userId
      return (start && end) || userId
    })
    setSelectedItems(itemUpdated)
    // 2. trigger parent:
    // 2.1 checked the unchecked parent(skip this handle)
    // 2.2 uncheck the parent(month)
    const _selectedMonths = _.remove(
      selectedMonths,
      (month) => item.startedAt.indexOf(month) !== 0
    )
    setSelectedMonths(_selectedMonths)
  }
  const handleChangeSingle = (e, monthString) => {
    const isChecked = e.target.checked
    const caregiverPending = _.filter(
      _dataCaregiver,
      (caregiver) => caregiver.status === 'PENDING'
    )
    const caregiverInMonth = _.filter(
      caregiverPending,
      (v) => v.startedAt.slice(0, 7) === monthString
    )
    // 1. parent: handle checked
    if (isChecked) {
      setSelectedMonths((months) => [...months, monthString])
      setSelectedItems(_.union(selectedItems, caregiverInMonth))
      return
    }
    // 2. parent: handle unchecked
    setSelectedMonths((months) => _.without(months, monthString))
    const result = _.filter(
      selectedItems,
      (v) => v.startedAt.slice(0, 7) !== monthString
    )
    setSelectedItems(result)
  }

  // Components:
  const ButtonConfirm = ({ monthString }) => {
    const withCheckedChild = _.find(
      selectedItems,
      (v) => v.startedAt.slice(0, 7) === monthString
    )
    const handleClick = () => {
      // 1. update status as: confirmed
      updateStatus({ monthString, status: 'CONFIRMED' })
      // 2. uncheck this month
      setSelectedMonths((months) => _.without(months, monthString))
      // 3. uncheck child items
      setSelectedItems((item) =>
        _.filter(item, (v) => v.startedAt.slice(0, 7) !== monthString)
      )
    }
    return (
      <button
        className={`text-white px-2 py-1 rounded ${
          !!withCheckedChild ? 'bg-green-600' : 'bg-gray-400'
        }`}
        onClick={() => handleClick()}
        disabled={!withCheckedChild}
      >
        Confirm
      </button>
    )
  }
  const Column = ({ monthString, days }) => (
    <div className="self-start border rounded m-3 min-w-60">
      {/* column header */}
      <div className="bg-gray-300 grid grid-cols-5 gap-3 p-3">
        {/* header LHS */}
        <div className="col-span-3">
          <label htmlFor={monthString}>
            <input
              id={monthString}
              type="checkbox"
              className="mr-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              onChange={(e) => handleChangeSingle(e, monthString)}
              checked={selectedMonths.includes(monthString)}
            />
            <strong>{dayjs(monthString).format('MMMM YYYY')}</strong>
          </label>
        </div>
        {/* header RHS */}
        <div className="col-span-2 text-right">
          <ButtonConfirm monthString={monthString} />
        </div>
      </div>
      {Object.keys(days).map((day, index) => (
        <div key={index}>
          <div className="p-1 bg-gray-100">
            <small>{dayjs(day).format('D MMMM')}</small>
          </div>
          {schedule[monthString][day].map((item, index) => (
            <Card item={item} key={index} />
          ))}
        </div>
      ))}
    </div>
  )
  const Duration = ({ start, end }) => {
    const isSameDay = start.slice(0, 10) === end.slice(0, 10)
    return (
      <p>
        {dayjs(start).format('hh:ss')}
        {` `}to{` `}
        {isSameDay ? dayjs(end).format('hh:ss') : '23:59'}
      </p>
    )
  }
  const Card = ({ item }) => (
    <div key={item.userId} className="p-3 grid grid-cols-8 gap-4 border-b-2">
      {/* card LHS */}
      <div>
        {item.status === 'PENDING' && (
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            value={item}
            checked={selectedItems.includes(item)}
            onChange={(e) => handleChangeBulk(e, item)}
          />
        )}
      </div>
      {/* card RHS */}
      <div className="col-span-7">
        <Duration start={item.startedAt} end={item.endedAt} />
        <p>
          {item.userId} - {item.lastName} {item.firstName} {item.chiName}
        </p>
        <p>
          <strong
            className="text-xl"
            style={{ color: item.role === 'EN' ? 'pink' : 'green' }}
          >
            •
          </strong>{' '}
          {item.role}
        </p>
        <div className="mt-3">
          <Status item={item} />
        </div>
      </div>
    </div>
  )
  const Status = ({ item }) => {
    const { status } = item
    // label: Declined / Confirmed
    const styleDeclined = { background: '#ffeaeb', color: '#fc5756' }
    const styleConfirmed = { background: '#e2f9f3', color: '#11c294' }
    if (status === 'DECLINED' || status === 'CONFIRMED') {
      return (
        <label
          htmlFor={item.startedAt}
          className="px-2 py-1 rounded"
          style={status === 'DECLINED' ? styleDeclined : styleConfirmed}
        >
          {status === 'DECLINED' ? 'Declined' : 'Confirmed'}
        </label>
      )
    }
    // buttons: Decline & Confirm
    return (
      <>
        <button
          className="px-2 py-1 rounded mr-3 cursor-pointer hover:opacity-75"
          style={{ border: '1px solid #fc5756', color: '#fc5756' }}
          onClick={(e) => updateStatus({ item, status: 'DECLINED' })}
        >
          Decline
        </button>
        <button
          className="px-2 py-1 rounded cursor-pointer hover:opacity-75"
          style={{ background: '#24c08c', color: 'white' }}
          onClick={(e) => updateStatus({ item, status: 'CONFIRMED' })}
        >
          Confirm
        </button>
      </>
    )
  }

  useEffect(() => {
    const _schedule = getScheduleDaily(_dataCaregiver)
    setSchedule(_schedule)
  }, [caregiverName]) // eslint-disable-line

  return (
    <main>
      <div className="container mx-auto flex">
        {Object.keys(schedule).map((month, index) => (
          <Column monthString={month} days={schedule[month]} key={index} />
        ))}
      </div>
    </main>
  )
}

export default IndexPage
