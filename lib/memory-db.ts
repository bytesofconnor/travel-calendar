type Row = Record<string, unknown> & { _id: string; _creationTime: number }

const indexFields: Record<string, Record<string, readonly string[]>> = {
  trips: {
    by_invite_code: ["inviteCode"],
    by_created_by: ["createdBy"],
  },
  tripMembers: {
    by_user: ["userId"],
    by_trip: ["tripId"],
    by_trip_and_user: ["tripId", "userId"],
  },
  tripItems: {
    by_trip: ["tripId"],
    by_trip_and_start: ["tripId", "startDate"],
  },
  tripNotes: {
    by_trip: ["tripId"],
  },
  tripPackingItems: {
    by_trip: ["tripId"],
    by_trip_checked_sort: ["tripId", "isChecked", "sortOrder"],
  },
  access: {
    by_user: ["userId"],
  },
}

function definedFields(value: Record<string, unknown>) {
  const doc: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value)) {
    if (field !== undefined) doc[key] = field
  }
  return doc
}

function compareField(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") return left - right
  return String(left ?? "").localeCompare(String(right ?? ""))
}

export type MemoryDb = ReturnType<typeof createMemoryDb>

export function createMemoryDb() {
  const tables = new Map<string, Map<string, Row>>()
  let clock = 1

  function rows(tableName: string) {
    let table = tables.get(tableName)
    if (!table) {
      table = new Map()
      tables.set(tableName, table)
    }
    return table
  }

  function tableNameOf(id: string) {
    const splitAt = id.indexOf("_")
    if (splitAt <= 0) return null
    return id.slice(0, splitAt)
  }

  return {
    insert(tableName: string, value: Record<string, unknown>) {
      const id = `${tableName}_${clock}`
      const doc = { ...definedFields(value), _id: id, _creationTime: clock } as Row
      clock += 1
      rows(tableName).set(id, doc)
      return id
    },
    get(id: string) {
      if (typeof id !== "string") return null
      const tableName = tableNameOf(id)
      if (!tableName) return null
      const doc = rows(tableName).get(id)
      return doc ? { ...doc } : null
    },
    patch(id: string, fields: Record<string, unknown>) {
      const tableName = tableNameOf(id)
      const doc = tableName ? rows(tableName).get(id) : undefined
      if (!doc) throw new Error(`db.patch missing ${id}`)
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) delete doc[key]
        else doc[key] = value
      }
    },
    delete(id: string) {
      const tableName = tableNameOf(id)
      const table = tableName ? rows(tableName) : undefined
      if (!table?.delete(id)) throw new Error(`db.delete missing ${id}`)
    },
    query(tableName: string) {
      return {
        withIndex(indexName: string, build: (query: { eq: (field: string, value: unknown) => unknown }) => void) {
          const fields = indexFields[tableName]?.[indexName]
          if (!fields) throw new Error(`db index ${tableName}.${indexName} is not implemented`)
          const filters: Array<[string, unknown]> = []
          const chain = {
            eq(field: string, value: unknown) {
              filters.push([field, value])
              return chain
            },
          }
          build(chain)
          if (filters.length === 0 || filters.length > fields.length) {
            throw new Error(`db index ${tableName}.${indexName} eq count ${filters.length}`)
          }
          for (let index = 0; index < filters.length; index += 1) {
            if (filters[index]?.[0] !== fields[index]) {
              throw new Error(`db index ${tableName}.${indexName} field ${filters[index]?.[0]}`)
            }
          }
          const matched = () => {
            const found = [...rows(tableName).values()].filter((row) =>
              filters.every(([field, value]) => row[field] === value),
            )
            const rest = fields.slice(filters.length)
            found.sort((left, right) => {
              for (const field of rest) {
                const order = compareField(left[field], right[field])
                if (order !== 0) return order
              }
              return left._creationTime - right._creationTime
            })
            return found.map((row) => ({ ...row }))
          }
          return {
            async unique() {
              const found = matched()
              if (found.length > 1) {
                throw new Error(`db.unique ${tableName}.${indexName} matched ${found.length}`)
              }
              return found[0] ?? null
            },
            async collect() {
              return matched()
            },
          }
        },
      }
    },
  }
}
