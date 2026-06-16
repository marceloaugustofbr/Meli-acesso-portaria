import React, { Suspense, lazy } from 'react';
import { Route, Switch, BrowserRouter, Redirect } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from '../../components/ui/ProtectedRoute';
import ExamGuard from '../../components/ui/ExamGuard';
import Loading from '../../components/ui/Loading';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const Login = lazy(() => import('../Login'));
const ExamIntro = lazy(() => import('../Exam/Intro'));
const ExamCheck = lazy(() => import('../Exam/Check'));
const ExamVideo = lazy(() => import('../Exam/Video'));
const ExamIdentification = lazy(() => import('../Exam/Identification'));
const ExamQuestions = lazy(() => import('../Exam/Questions'));
const ExamTerms = lazy(() => import('../Exam/Terms'));
const ExamSignature = lazy(() => import('../Exam/Signature'));
const ExamResult = lazy(() => import('../Exam/Result'));
const AdminDashboard = lazy(() => import('../Admin/Dashboard'));
const AdminExams = lazy(() => import('../Admin/Exams'));
const AdminExamDetail = lazy(() => import('../Admin/ExamDetail'));
const AdminUsers = lazy(() => import('../Admin/Users'));
const AdminSettings = lazy(() => import('../Admin/Settings'));
const Portaria = lazy(() => import('../Portaria'));

const ROUTES = {
  ROOT: '/',
  LOGIN: '/login',
  EXAM_INTRO: '/exam/intro',
  EXAM_CHECK: '/exam/check',
  EXAM_VIDEO: '/exam/video',
  EXAM_IDENTIFICATION: '/exam/identification',
  EXAM_QUESTIONS: '/exam/questions',
  EXAM_TERMS: '/exam/terms',
  EXAM_SIGNATURE: '/exam/signature',
  EXAM_RESULT: '/exam/result',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_EXAMS: '/admin/exams',
  ADMIN_EXAM_DETAIL: '/admin/exam/:id',
  ADMIN_USERS: '/admin/users',
  ADMIN_SETTINGS: '/admin/settings',
};

const stepRoutes = [
  { path: ROUTES.EXAM_CHECK, step: 'check', component: ExamCheck },
  { path: ROUTES.EXAM_VIDEO, step: 'video', component: ExamVideo },
  { path: ROUTES.EXAM_IDENTIFICATION, step: 'identification', component: ExamIdentification },
  { path: ROUTES.EXAM_QUESTIONS, step: 'questions', component: ExamQuestions },
  { path: ROUTES.EXAM_TERMS, step: 'terms', component: ExamTerms },
  { path: ROUTES.EXAM_SIGNATURE, step: 'signature', component: ExamSignature },
  { path: ROUTES.EXAM_RESULT, step: 'result', component: ExamResult },
];

function LoadingFallback() {
  return <Loading fullPage />;
}

export default function RouterComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route exact path={ROUTES.LOGIN} component={Login} />
            <Route exact path="/portaria" component={Portaria} />

            <Route exact path={ROUTES.EXAM_INTRO} component={ExamIntro} />
            {stepRoutes.map(({ path, step, component }) => (
              <ExamGuard key={path} exact path={path} step={step} component={component} />
            ))}

            <ProtectedRoute exact path={ROUTES.ADMIN_DASHBOARD} component={AdminDashboard} />
            <ProtectedRoute exact path={ROUTES.ADMIN_EXAMS} component={AdminExams} />
            <ProtectedRoute exact path={ROUTES.ADMIN_EXAM_DETAIL} component={AdminExamDetail} />
            <ProtectedRoute exact path={ROUTES.ADMIN_USERS} component={AdminUsers} />
            <ProtectedRoute exact path={ROUTES.ADMIN_SETTINGS} component={AdminSettings} />

            <Route exact path={ROUTES.ROOT}>
              <Redirect to={ROUTES.EXAM_INTRO} />
            </Route>

            <Route render={() => <Loading fullPage text="Página não encontrada" />} />
          </Switch>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
