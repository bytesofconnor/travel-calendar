export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return nextResolve(specifier, context)
  }
  if (/\.[cm]?[jt]s$/.test(specifier)) {
    return nextResolve(specifier, context)
  }
  const errors = []
  for (const extension of [".ts", ".js", ".mjs"]) {
    try {
      return await nextResolve(`${specifier}${extension}`, context)
    } catch (error) {
      errors.push(error)
    }
  }
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    throw errors[0] ?? error
  }
}
