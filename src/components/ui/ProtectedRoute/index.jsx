import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../../hooks';
import Loading from '../Loading';
import ROUTES from '../../../constants/routes';

export default function ProtectedRoute({ component: Component, ...rest }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loading fullPage />;

  return (
    <Route
      {...rest}
      render={(props) =>
        isAuthenticated ? <Component {...props} /> : <Redirect to={ROUTES.LOGIN} />
      }
    />
  );
}

ProtectedRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
};
