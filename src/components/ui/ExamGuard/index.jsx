import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useExamStore } from '../../../store';
import ROUTES from '../../../constants/routes';

const stepOrder = ['intro', 'check', 'video', 'identification', 'questions', 'terms', 'signature', 'result'];

export default function ExamGuard({ component: Component, step, path, exact }) {
  const currentStep = useExamStore((s) => s.step);

  const currentIndex = stepOrder.indexOf(currentStep);
  const allowedIndex = stepOrder.indexOf(step);

  if (allowedIndex > currentIndex) {
    return <Redirect to={ROUTES.EXAM_INTRO} />;
  }

  return (
    <Route
      exact={exact}
      path={path}
      render={(props) => <Component {...props} />}
    />
  );
}

ExamGuard.propTypes = {
  component: PropTypes.elementType.isRequired,
  step: PropTypes.string.isRequired,
};
