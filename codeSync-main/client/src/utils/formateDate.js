export function formatDate(timestamp) {
  const date = new Date(timestamp)

  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0") // minimal addition
  const amOrPm = hours >= 12 ? "PM" : "AM"

  hours = hours % 12
  hours = hours ? hours : 12 // Handle midnight

  const formattedTime = `${hours}:${minutes}:${seconds} ${amOrPm}`

  return formattedTime
}
