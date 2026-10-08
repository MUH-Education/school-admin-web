import { Outlet } from 'react-router'
import { SampleDataLabel } from './SampleDataLabel'

export function Root() {
  return (
    <>
      <Outlet />
      <SampleDataLabel />
    </>
  )
}
