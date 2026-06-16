import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link, useHistory } from 'react-router-dom';
import { authService } from '../../../services';
import ROUTES from '../../../constants/routes';

export default function AdminLayout({ children }) {
  const history = useHistory();
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
            Admin - Segurança
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
            <Link className="navbar-item" to={ROUTES.ADMIN_DASHBOARD} onClick={() => setMenuOpen(false)}>Dashboard</Link>
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
