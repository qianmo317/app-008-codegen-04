import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'TaskList', component: () => import('./views/TaskList.vue') },
  { path: '/new', name: 'TaskNew', component: () => import('./views/TaskNew.vue') },
  { path: '/task/:id', name: 'TaskOverview', component: () => import('./views/TaskOverview.vue') },
  { path: '/task/:id/box/:code', name: 'BoxDetail', component: () => import('./views/BoxDetail.vue') },
  { path: '/task/:id/register', name: 'BoxRegister', component: () => import('./views/BoxRegister.vue') },
  { path: '/task/:id/labels', name: 'LabelsPrint', component: () => import('./views/LabelsPrint.vue') },
  { path: '/task/:id/scan', name: 'ScanCheck', component: () => import('./views/ScanCheck.vue') },
  { path: '/task/:id/check', name: 'DeliveryCheck', component: () => import('./views/DeliveryCheck.vue') },
  { path: '/assets', name: 'AssetList', component: () => import('./views/AssetList.vue') },
  { path: '/assets/new', name: 'AssetNew', component: () => import('./views/AssetForm.vue') },
  { path: '/assets/review', name: 'AssetReview', component: () => import('./views/AssetReview.vue') },
  { path: '/assets/:id', name: 'AssetDetail', component: () => import('./views/AssetDetail.vue') },
  { path: '/assets/:id/edit', name: 'AssetEdit', component: () => import('./views/AssetForm.vue') },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
