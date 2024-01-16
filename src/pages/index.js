import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import _ from 'lodash'
// custom
import _dataCaregiver from '../../data-caregiver.json'
import { getScheduleGrouped, getScheduleFlatten } from '../utils'

const IndexPage = () => {
  const [schedule, setSchedule] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [caregiverName, setCaregiverName] = useState(null)
  const [showCollapse, setShowCollapse] = useState(null)
  const [newShift, setNewShift] = useState([])

  // handlers:
  // dynamic update caregiver data
  const getCaregiver = () => {
    let dataCaregiver = _dataCaregiver
    if (_.size(newShift)) {
      dataCaregiver = _.concat(dataCaregiver, newShift)
    }
    if (!caregiverName) {
      return dataCaregiver
    }
    return _.filter(dataCaregiver, (user) => {
      const caregiverNameLabel = `${user.lastName} ${user.firstName}${user.chiName}`
      const caregiverNameLabelWithGap = `${user.lastName} ${user.firstName} ${user.chiName}`
      const _caregiverName = caregiverName.toLocaleLowerCase()
      return (
        caregiverNameLabel.toLocaleLowerCase().match(_caregiverName) ||
        caregiverNameLabelWithGap.toLocaleLowerCase().match(_caregiverName)
      )
    })
  }
  // bulk process with `monthString`, otherwise single's `item`
  const updateStatus = ({ monthString, item, status }) => {
    const _schedule = getScheduleFlatten(schedule)
    const scheduleUpdated = _.forEach([..._schedule, ...newShift], (entry) => {
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
    setSchedule(getScheduleGrouped(_.uniqWith(scheduleUpdated, _.isEqual)))
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
    <div className="self-start border rounded m-3 min-w-72">
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
    const isSameDay = start?.slice(0, 10) === end?.slice(0, 10)
    return (
      <p>
        {dayjs(start).format('hh:ss')}
        {` `}to{` `}
        {isSameDay ? dayjs(end).format('hh:ss') : '23:59'}
      </p>
    )
  }
  const Filter = ({ item }) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5 text-gray-400 inline cursor-pointer"
        onClick={() =>
          setCaregiverName(`${item.lastName} ${item.firstName} ${item.chiName}`)
        }
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        />
      </svg>
    )
  }
  const Card = ({ item }) => (
    <div
      key={item.userId}
      className="p-3 grid grid-cols-8 gap-4 border-b-2 min-h-40"
    >
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
        <span>
          {item.userId} - {item.lastName} {item.firstName} {item.chiName}
          <Filter item={item} />
        </span>
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
  const Search = () => {
    return (
      <div className="container mx-auto mb-3 p-3 fixed w-full top-0 bg-white">
        <strong className="float-left">Caregiver Name</strong>
        <div className="float-left relative w-64">
          <input
            autoFocus
            type="search"
            className="p-1 px-2 ml-3 h-8 border relative w-full"
            placeholder="Search"
            value={caregiverName}
            onChange={(e) => setCaregiverName(e.target.value)}
          />
          <div
            className="absolute top-2 right-0 p-1"
            style={{ top: '1px', right: '-10px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-5 w-5 text-gray-400 ${
                caregiverName ? 'hidden' : ''
              }`}
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              />
            </svg>
          </div>
        </div>
        <CreateShift />
      </div>
    )
  }
  const CreateShift = () => {
    function handleSubmit(event) {
      event.preventDefault()
      const fomrItems = {
        startedAt: event.target.startedAt.value,
        endedAt: event.target.endedAt.value,
        firstName: event.target.firstName.value,
        lastName: event.target.lastName.value,
        chiName: event.target.chiName.value,
        status: event.target.status.value,
        userId: event.target.userId.value,
        role: event.target.role.value,
      }
      // skip error/empty handle zzZ
      setNewShift((oldArray) => [...oldArray, fomrItems])

      setShowCollapse(false)
    }
    return (
      <form onSubmit={handleSubmit}>
        <button
          type="button"
          className="text-white px-2 py-1 rounded absolute right-0"
          style={{ background: '#16A34A' }}
          onClick={() => setShowCollapse(!showCollapse)}
        >
          {showCollapse ? 'X' : 'Create Shift'}
        </button>
        <div
          className={`hs-collapse w-full overflow-hidden transition-[height] duration-300 ${
            showCollapse ? '' : 'hidden'
          }`}
          aria-labelledby="hs-basic-collapse"
        >
          <div class="mt-5 bg-white rounded-lg py-3 px-4 dark:bg-gray-200">
            <div className="mt-2">
              <input
                name="startedAt"
                type="text"
                className="p-1 mr-2"
                placeholder="Started at"
              />
              <input
                name="endedAt"
                type="text"
                className="p-1"
                placeholder="End at"
              />
            </div>
            <div className="mt-2">
              <input
                name="firstName"
                type="text"
                className="p-1 mr-2"
                placeholder="First Name"
              />
              <input
                name="lastName"
                type="text"
                className="p-1 mr-2"
                placeholder="Last Name"
              />
            </div>
            <div className="mt-2">
              <input
                name="chiName"
                type="text"
                className="p-1 mr-2"
                placeholder="Chinese Name"
              />
              <input
                name="userId"
                type="text"
                className="p-1"
                placeholder="User ID"
              />
            </div>
            {/* radio: status */}
            <div className="mt-2">
              <strong>Status: </strong>
              <input
                type="radio"
                name="status"
                id="statusPending"
                value="PENDING"
                checked
              />
              <label
                htmlFor="statusPending"
                className="ml-1 mr-3"
                for="statusPending"
              >
                PENDING
              </label>
              <input
                type="radio"
                name="status"
                id="statusDeclined"
                value="DECLINED"
              />
              <label
                htmlFor="statusConfirmed"
                className="ml-1 mr-3"
                for="statusDeclined"
              >
                DECLINED
              </label>
              <input
                type="radio"
                name="status"
                id="statusConfirmed"
                value="CONFIRMED"
              />
              <label
                htmlFor="status"
                className="ml-1 mr-3"
                for="statusConfirmed"
              >
                CONFIRMED
              </label>
            </div>
            {/* radio: role */}
            <div className="mt-2">
              <strong>Role: </strong>
              <input type="radio" name="role" id="role-st" value="ST" checked />
              <label htmlFor="role-st" className="ml-1 mr-3" for="role-st">
                ST
              </label>
              <input type="radio" name="role" id="role-pwh" value="PWH" />
              <label htmlFor="role-pwh" className="ml-1 mr-3" for="role-pwh">
                PWH
              </label>
            </div>

            <button
              className="bg-green-700 text-white p-2 rounded mt-2 px-5"
              style={{ background: '#24c08c' }}
            >
              Submit
            </button>
          </div>
        </div>
      </form>
    )
  }

  useEffect(() => {
    const _schedule = getScheduleGrouped(getCaregiver())
    setSchedule(_schedule)
  }, [caregiverName, newShift]) // eslint-disable-line

  return (
    <main>
      <Search />
      <div className="mt-20 md:mt-16 container mx-auto md:flex">
        {Object.keys(schedule).map((month, index) => (
          <Column monthString={month} days={schedule[month]} key={index} />
        ))}
      </div>
    </main>
  )
}

export default IndexPage
