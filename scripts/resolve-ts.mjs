export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../")
  if (relative && !/\.(?:[cm]?[jt]s|json|node)$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context)
    } catch {
      return nextResolve(`${specifier}.js`, context)
    }
  }
  return nextResolve(specifier, context)
}
