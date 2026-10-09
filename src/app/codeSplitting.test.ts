import router from './router.tsx?raw'

// A phone that opens /trip must not download the office app. Everything of the office is loaded
// with import('...') when its address is opened. A normal `import ... from` at the top of the
// router would put it in the first file that every phone downloads.
describe('code splitting', () => {
  const staticImports = router
    .split('\n')
    .filter((line) => /^import\s.*from\s+['"]/.test(line))
    .map((line) => /from\s+['"]([^'"]+)['"]/.exec(line)?.[1] ?? '')

  it('the router does not import any page or the office frame at the top', () => {
    const offenders = staticImports.filter(
      (path) =>
        path.includes('/features/') ||
        path.includes('/attendant/') ||
        path.endsWith('AdminShell') ||
        path.endsWith('Sidebar') ||
        path.endsWith('LoginPage'),
    )
    expect(offenders).toEqual([])
  })

  it('the office frame and the phone pages are loaded with import()', () => {
    expect(router).toContain("import('./AdminShell')")
    expect(router).toContain("import('@/attendant/pages/TripLayout')")
    expect(router).toContain("import('@/attendant/pages/PickupPage')")
  })
})
