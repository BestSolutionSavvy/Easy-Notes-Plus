import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import NotebooksView from '../views/NotebooksView.vue'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    props: (route) => ({
      fileName: route.query.fileName as string | undefined,
      subject: route.query.subject as string | undefined,
      pdfFileName: route.query.pdfFileName as string | undefined,
    }),
  },
  {
    path: '/home',
    redirect: '/',
  },
  {
    path: '/notebooks',
    name: 'Notebooks',
    component: NotebooksView,
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView,
  },
  {
    path: '/:pathMatch(.*)*',
    component: NotFoundView,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
