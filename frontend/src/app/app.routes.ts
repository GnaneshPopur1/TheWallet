import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { AboutComponent } from './features/about/about';
import { DownloadComponent } from './features/download/download';
import { Dashboard } from './features/dashboard/dashboard';
import { EducationHub } from './features/education-hub/education-hub';
import { FixedCosts } from './features/fixed-costs/fixed-costs';
import { Roommates } from './features/roommates/roommates';
import { Receipts } from './features/receipts/receipts';
import { Credit } from './features/credit/credit';
import { Subscriptions } from './features/subscriptions/subscriptions';
import { Budgets } from './features/budgets/budgets';
import { Register } from './features/auth/register/register';
import { Login } from './features/auth/login/login';
import { Onboarding } from './features/onboarding/onboarding';
import { Settings } from './features/settings/settings';
import { Connections } from './features/connections/connections';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'about', component: AboutComponent },
  { path: 'download', component: DownloadComponent },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'onboarding', component: Onboarding, canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'receipts', component: Receipts, canActivate: [authGuard] },
  { path: 'credit', component: Credit, canActivate: [authGuard] },
  { path: 'education', component: EducationHub, canActivate: [authGuard] },
  { path: 'costs', component: FixedCosts, canActivate: [authGuard] },
  { path: 'roommates', component: Roommates, canActivate: [authGuard] },
  { path: 'subscriptions', component: Subscriptions, canActivate: [authGuard] },
  { path: 'budgets', component: Budgets, canActivate: [authGuard] },
  { path: 'connections', component: Connections, canActivate: [authGuard] },
  { path: 'settings', component: Settings, canActivate: [authGuard] },
  { path: '**', redirectTo: '/dashboard' },
];
