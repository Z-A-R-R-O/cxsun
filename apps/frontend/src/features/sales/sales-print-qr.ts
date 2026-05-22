export const portalQrPath = Array.from({ length: 49 * 49 }, (_, index) => {
  const row = Math.floor(index / 49)
  const column = index % 49

  return getPortalQrCell(row, column) ? `M${column} ${row}h1v1h-1z` : ""
}).join("")

function getPortalQrCell(row: number, column: number) {
  if (isFinderCell(row, column, 0, 0)) return finderCell(row, column, 0, 0)
  if (isFinderCell(row, column, 0, 42)) return finderCell(row, column, 0, 42)
  if (isFinderCell(row, column, 42, 0)) return finderCell(row, column, 42, 0)
  if (row === 6 || column === 6) return (row + column) % 2 === 0
  if (row > 14 && column > 14 && row < 35 && column < 35) {
    return (row * 13 + column * 19 + row * column) % 11 < 6
  }

  return (row * 17 + column * 31 + row * column * 7 + 23) % 13 < 7
}

function isFinderCell(row: number, column: number, top: number, left: number) {
  return row >= top && row < top + 7 && column >= left && column < left + 7
}

function finderCell(row: number, column: number, top: number, left: number) {
  const localRow = row - top
  const localColumn = column - left
  const isOuter = localRow === 0 || localRow === 6 || localColumn === 0 || localColumn === 6
  const isInner = localRow >= 2 && localRow <= 4 && localColumn >= 2 && localColumn <= 4

  return isOuter || isInner
}
