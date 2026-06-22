import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';

const stepOrder = ['intro', 'check', 'video', 'identification', 'questions', 'terms', 'signature', 'result'];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // eslint-disable-next-line no-bitwise
    hash = ((hash << 5) - hash) + char;
    // eslint-disable-next-line no-bitwise
    hash |= 0;
  }
  return hash;
}

function getCompletedSteps() {
  try {
    const raw = sessionStorage.getItem('exam_completed_steps');
    if (!raw) return [];
    const data = JSON.parse(raw);
    const check = hashCode(JSON.stringify(data.steps));
    if (data.hash !== check) return [];
    return data.steps;
  } catch {
    return [];
  }
}

function markStepCompleted(step) {
  const steps = getCompletedSteps();
  if (!steps.includes(step)) {
    steps.push(step);
  }
  const data = { steps, hash: hashCode(JSON.stringify(steps)) };
  sessionStorage.setItem('exam_completed_steps', JSON.stringify(data));
}

function hasCompletedStep(step) {
  return getCompletedSteps().includes(step);
}

export default function ExamGuard({ component: Component, step, path, exact }) {
  const currentStep = useExamStore((s) => s.step);
  const allowedIndex = stepOrder.indexOf(step);
  const currentIndex = stepOrder.indexOf(currentStep);

  if (allowedIndex === 0) {
    return (
      <Route
        exact={exact}
        path={path}
        render={(props) => {
          markStepCompleted(step);
          return <Component {...props} />;
        }}
      />
    );
  }

  const prevStep = stepOrder[allowedIndex - 1];
  if (!hasCompletedStep(prevStep)) {
    return <Redirect to={ROUTES.EXAM_INTRO} />;
  }

  if (allowedIndex > currentIndex) {
    return <Redirect to={ROUTES.EXAM_INTRO} />;
  }

  return (
    <Route
      exact={exact}
      path={path}
      render={(props) => {
        markStepCompleted(step);
        return <Component {...props} />;
      }}
    />
  );
}

ExamGuard.propTypes = {
  component: PropTypes.elementType.isRequired,
  step: PropTypes.string.isRequired,
};
