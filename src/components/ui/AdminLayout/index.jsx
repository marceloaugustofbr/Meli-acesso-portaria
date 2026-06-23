import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { authService } from '../../../services';
import ROUTES from '../../../constants/routes';

const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD },
  { label: 'Usuários', path: ROUTES.ADMIN_USERS },
];

export default function AdminLayout({ children }) {
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    history.push(ROUTES.LOGIN);
  };

  return (
    <div>
      <nav className="navbar is-dark" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <Link className="navbar-item has-text-weight-bold" to={ROUTES.ADMIN_DASHBOARD}>
            Safe Acess - DHL
          </Link>
          <a
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMenuOpen((o) => !o); }}
            className={classNames('navbar-burger', { 'is-active': menuOpen })}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="menu"
            aria-expanded={menuOpen}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </a>
        </div>
        <div className={classNames('navbar-menu', { 'is-active': menuOpen })}>
          <div className="navbar-start">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                className={classNames('navbar-item', { 'is-active': location.pathname === item.path })}
                to={item.path}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="navbar-end">
            <div className="navbar-item">
              <button className="button is-light is-small" onClick={handleLogout}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="section">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}

AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
