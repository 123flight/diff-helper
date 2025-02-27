import { DataRowStates, getChangedItem, hasValForArray, invariant } from "./utils"

export type ListKey = string | number

export interface BaseSimpleListDiffOptions {
  key: string
  getChangedItem: Function
  fields?: string[]
}

export interface SimpleListDiffOptions extends BaseSimpleListDiffOptions {
  isSplit?: boolean
}

const DEFAULT_OPTIONS: SimpleListDiffOptions = {
  key: 'id',
  getChangedItem,
  fields: [],
  isSplit: true
}

const checkOptions = (opts: BaseSimpleListDiffOptions) => {
  const { key, getChangedItem } = opts
  invariant(typeof key !== 'string' || key.length === 0, 'options "key" must be a no empty string')
  invariant(getChangedItem && typeof getChangedItem !== 'function', 'options "getChangedItem" must be a function')
}

export const simpleListDiff = (
  newVal: any[],
  oldVal: any[],
  options: SimpleListDiffOptions = DEFAULT_OPTIONS,
) => {
  if (!hasValForArray(newVal)) {
    return null
  }

  const opts = { ...DEFAULT_OPTIONS, ...options}

  const { key, getChangedItem, fields, isSplit } = opts

  checkOptions(opts)

  if (!hasValForArray(oldVal)) {
    return {
      ...fields?.includes('modifiedCount') && { modifiedCount: 0 },
      ...fields?.includes('addedCount') && { addedCount: newVal.length },
      ...fields?.includes('deletedCount') && { deletedCount: 0 },
      [isSplit ? 'line' : 'addedLines']: newVal.map(item => ({
        ...item,
        rowState: DataRowStates.Added,
      })),
    }
  }

  const retLines: any[] = []

  let addedCount: number = 0
  let modifiedCount: number = 0
  let deletedCount: number = 0

  const checkedKeys: Set<ListKey> = new Set<ListKey>();

  newVal.forEach(newLine => {
    let oldLine: any = oldVal.find(x => x[key] === newLine[key])
    checkedKeys.add(oldLine[key])
    if (!oldLine) {
      newLine.rowState = DataRowStates.Added
      retLines.push(newLine)
      addedCount++
    } else {
      const result = getChangedItem(newLine, oldLine)
      if (result) {
        retLines.push({ ...result, rowState: DataRowStates.Modified })
        modifiedCount++
      }
    }
  })

  oldVal.forEach(oldLine => {
    if (checkedKeys.has(oldLine[key])) {
      return
    }
    const newLine = newVal.find(x => x[key] === oldLine[key])

    if (!newLine) {
      retLines.push({ [key]: oldLine[key], rowState: DataRowStates.Deleted })
      deletedCount++
    }
  })

  const dataToSet: Record<string, any> = {}

  if (isSplit) {
    const addedLines: any[] = []
    const deletedLines: any[] = []
    const modifiedLines: any[] = []
    retLines.forEach(item => {
      const { rowState, ...rowLine } = item
      switch (rowState) {
        case DataRowStates.Added:
          addedLines.push(rowLine)
          break;
        case DataRowStates.Deleted:
          deletedLines.push(rowLine)
          break;
        case DataRowStates.Modified:
          modifiedLines.push(rowLine)
          break;
      }
    })
    dataToSet.addedLines = addedLines
    dataToSet.deletedLines = deletedLines
    dataToSet.modifiedLines = modifiedLines
  } else {
    dataToSet.lines = retLines
  }

  return {
    ...fields?.includes('modifiedCount') && { modifiedCount },
    ...fields?.includes('addedCount') && { addedCount },
    ...fields?.includes('deletedCount') && { deletedCount },
    ...dataToSet
  }
}

export const simpleListDiffWithSort = (
  newVal: any[],
  oldVal: any[],
  options: BaseSimpleListDiffOptions = DEFAULT_OPTIONS,
) => {
  if (!hasValForArray(newVal)) {
    return null
  }

  const opts = { ...DEFAULT_OPTIONS, ...options }

  checkOptions(opts)

  const { key, getChangedItem, fields, } = opts

  if (!hasValForArray(oldVal)) {
    return {
      ...fields?.includes('modifiedCount') && { modifiedCount: 0 },
      ...fields?.includes('addedCount') && { addedCount: newVal.length },
      ...fields?.includes('deletedCount') && { deletedCount: 0 },
      sortChanged: true,
      lines: newVal.map(item => ({
        ...item,
        rowState: DataRowStates.Added,
      })),
    }
  }

  const retLines: any[] = []

  let addedCount: number = 0
  let modifiedCount: number = 0
  let deletedCount: number = 0
  let sortChanged = false

  const checkedKeys: Set<ListKey> = new Set<ListKey>();

  newVal.forEach(newLine => {
    const oldLine: any = oldVal.find(x => x[key!] === newLine[key!])
    checkedKeys.add(oldLine[key!])

    if (!oldLine) {
      newLine.rowState = DataRowStates.Added
      retLines.push(newLine)
      addedCount++
    } else {
      const result = getChangedItem(newLine, oldLine)
      if (result) {
        retLines.push({ ...result, rowState: DataRowStates.Modified })
        modifiedCount++
      } else {
        retLines.push({ [key!]: newLine[key!], rowState: DataRowStates.UnChanged })
      }
    }
  })

  oldVal.forEach(oldLine => {
    if (checkedKeys.has(oldLine[key!])) {
      return
    }
    const newLine = newVal.find(x => x[key!] === oldLine[key!])
    if (!newLine) {
      retLines.push({ [key!]: oldLine[key!], rowState: DataRowStates.Deleted })
      deletedCount++
    }
  })


  if (addedCount !== 0 || deletedCount !== 0) {
    sortChanged = true
  } else {
    for (let i = 0; i < newVal.length; i++) {
      if (newVal[i][key!] !== oldVal[i][key!]) {
        sortChanged = true
        break;
      }
    }
  }

  return {
    ...fields?.includes('modifiedCount') && { modifiedCount },
    ...fields?.includes('addedCount') && { addedCount },
    ...fields?.includes('deletedCount') && { deletedCount },
    sortChanged,
    lines: retLines,
  }
}