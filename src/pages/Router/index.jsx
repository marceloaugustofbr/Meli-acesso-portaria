import React, { Suspense, lazy } from 'react';
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ROUTES from '../../constants/routes';
import ExamGuard from '../../components/ui/ExamGuard';
import AdminLayout from '../../components/ui/AdminLayout';
import Loading from '../../components/ui/Loading';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import { useAuth } from '../../hooks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 30 * 1000,
    },
  },
});

const Login = lazy(() => import('../Login'));
const ExamIntro = lazy(() => import('../Exam/Intro'));
const ExamCheck = lazy(() => import('../Exam/Check'));
const ExamRules = lazy(() => import('../Exam/Rules'));
const ExamVideo = lazy(() => import('../Exam/Video'));
const ExamIdentification = lazy(() => import('../Exam/Identification'));
const ExamQuestions = lazy(() => import('../Exam/Questions'));
const ExamTerms = lazy(() => import('../Exam/Terms'));
const ExamSignature = lazy(() => import('../Exam/Signature'));
const ExamResult = lazy(() => import('../Exam/Result'));
const Portaria = lazy(() => import('../Portaria'));

const AdminDashboard = lazy(() => import('../Admin/Dashboard'));
const AdminExamDetail = lazy(() => import('../Admin/ExamDetail'));
const AdminUsers = lazy(() => import('../Admin/Users'));
const AdminSettings = lazy(() => import('../Admin/Settings'));

const stepRoutes = [
  { path: ROUTES.EXAM_CHECK, step: 'check', component: ExamCheck },
  { path: ROUTES.EXAM_RULES, step: 'rules', component: ExamRules },
  { path: ROUTES.EXAM_VIDEO, step: 'video', component: ExamVideo },
  { path: ROUTES.EXAM_IDENTIFICATION, step: 'identification', component: ExamIdentification },
  { path: ROUTES.EXAM_QUESTIONS, step: 'questions', component: ExamQuestions },
  { path: ROUTES.EXAM_TERMS, step: 'terms', component: ExamTerms },
  { path: ROUTES.EXAM_SIGNATURE, step: 'signature', component: ExamSignature },
  { path: ROUTES.EXAM_RESULT, step: 'result', component: ExamResult },
];

function AdminGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading fullPage />;
  if (!isAuthenticated) return <Redirect to={ROUTES.LOGIN} />;
  return <AdminLayout>{children}</AdminLayout>;
}

function AdminRoutes() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><Loading /></div>}>
      <Switch>
        <Route exact path={ROUTES.ADMIN_DASHBOARD} component={AdminDashboard} />
        <Route exact path={ROUTES.ADMIN_EXAM_DETAIL} component={AdminExamDetail} />
        <Route exact path={ROUTES.ADMIN_USERS} component={AdminUsers} />
        <Route exact path={ROUTES.ADMIN_SETTINGS} component={AdminSettings} />
        <Redirect to={ROUTES.ADMIN_DASHBOARD} />
      </Switch>
    </Suspense>
  );
}

export default function RouterComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<Loading fullPage />}>
            <Switch>
              <Route exact path={ROUTES.LOGIN} component={Login} />
              <Route exact path={ROUTES.PORTARIA} component={Portaria} />

              <ExamGuard exact path={ROUTES.EXAM_INTRO} step="intro" component={ExamIntro} />
              {stepRoutes.map(({ path, step, component }) => (
                <ExamGuard key={path} exact path={path} step={step} component={component} />
              ))}

              <Route path="/admin" render={() => <AdminGuard><AdminRoutes /></AdminGuard>} />

              <Route exact path={ROUTES.ROOT}>
                <Redirect to={ROUTES.EXAM_INTRO} />
              </Route>

              <Route render={() => <Loading fullPage text="Página não encontrada" />} />
            </Switch>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
