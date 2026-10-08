import { createBrowserRouter } from 'react-router'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { Root } from './Root'

export const routes = [
  {
    path: '/',
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)
