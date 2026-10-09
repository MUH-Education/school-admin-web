import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import type { Permission } from '@/auth/types'
import { AdminShell } from './AdminShell'
import { CannotOpenPage, RequireLogin, RequirePermission } from './guards'
import { Landing } from './Landing'
import { NotFoundPage } from './NotFoundPage'
import { Placeholder, TripPlaceholder } from './Placeholder'
import { Root } from './Root'

/** A page that needs a permission and is built in a later phase. */
function placeholder(
  path: string,
  title: string,
  permission: Permission,
  phase: number,
): RouteObject {
  return {
    path,
    element: (
      <RequirePermission permission={permission}>
        <Placeholder title={title} phase={phase} />
      </RequirePermission>
    ),
  }
}

export const routes: RouteObject[] = [
  {
    Component: Root,
    children: [
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('@/auth/LoginPage')).LoginPage }),
      },
      {
        element: (
          <RequireLogin>
            <Outlet />
          </RequireLogin>
        ),
        children: [
          { index: true, element: <Landing /> },
          {
            path: 'trip/*',
            element: (
              <RequirePermission permission="TRIPS_RECORD">
                <TripPlaceholder />
              </RequirePermission>
            ),
          },
          {
            Component: AdminShell,
            children: [
              placeholder('bus-status', 'Bus status', 'BUS_STATUS_VIEW', 4),
              placeholder('bus-status/routes/:routeId', 'One bus', 'BUS_STATUS_VIEW', 4),
              {
                path: 'routes',
                lazy: async () => {
                  const { RoutesPage } = await import('@/features/routes/pages/RoutesPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="ROUTES_VIEW">
                        <RoutesPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'vehicles',
                lazy: async () => {
                  const { VehiclesPage } = await import('@/features/vehicles/pages/VehiclesPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="VEHICLES_VIEW">
                        <VehiclesPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'vehicles/new',
                lazy: async () => {
                  const { VehicleDetailPage } =
                    await import('@/features/vehicles/pages/VehicleDetailPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="VEHICLES_EDIT">
                        <VehicleDetailPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'vehicles/:id',
                lazy: async () => {
                  const { VehicleDetailPage } =
                    await import('@/features/vehicles/pages/VehicleDetailPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="VEHICLES_VIEW">
                        <VehicleDetailPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'students',
                lazy: async () => {
                  const { StudentsPage } = await import('@/features/students/pages/StudentsPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="STUDENTS_VIEW">
                        <StudentsPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'students/:id',
                lazy: async () => {
                  const { StudentPage } = await import('@/features/students/pages/StudentPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="STUDENTS_VIEW">
                        <StudentPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              {
                path: 'admissions/new',
                lazy: async () => {
                  const { AdmissionPage } =
                    await import('@/features/admissions/pages/AdmissionPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="ADMISSIONS_CREATE">
                        <AdmissionPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              placeholder('enquiries', 'Enquiries', 'ENQUIRIES_VIEW', 7),
              placeholder('enquiries/new', 'Add an enquiry', 'ENQUIRIES_EDIT', 7),
              placeholder('enquiries/:id', 'One enquiry', 'ENQUIRIES_VIEW', 7),
              placeholder('messages', 'Messages', 'MESSAGES_VIEW', 6),
              placeholder('analytics', 'Analytics', 'ANALYTICS_VIEW', 9),
              {
                path: 'users',
                lazy: async () => {
                  const { UsersPage } = await import('@/features/users/pages/UsersPage')
                  return {
                    Component: () => (
                      <RequirePermission permission="USERS_MANAGE">
                        <UsersPage />
                      </RequirePermission>
                    ),
                  }
                },
              },
              { path: 'cannot-open', Component: CannotOpenPage },
              { path: '*', Component: NotFoundPage },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
