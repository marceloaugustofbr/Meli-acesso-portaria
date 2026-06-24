import React, { useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { authService } from '../../../services';
import { useAuth } from '../../../hooks';
import ROUTES from '../../../constants/routes';
import './AdminLayout.scss'; // eslint-disable-line

const BASE_NAV = [
  { label: 'Dashboard', path: ROUTES.ADMIN_DASHBOARD },
  { label: 'Usuários', path: ROUTES.ADMIN_USERS, requireAdmin: true },
];

export default function AdminLayout({ children }) {
  const { isAdmin } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = BASE_NAV.filter((item) => !item.requireAdmin || isAdmin);

  const handleLogout = async () => {
    await authService.logout();
    history.push(ROUTES.LOGIN);
  };

  return (
    <div>
      <nav className="admin-navbar" role="navigation" aria-label="main navigation">
        <div className="admin-navbar-inner">
          <div className="admin-navbar-brand">
            <Link className="admin-navbar-logo" to={ROUTES.ADMIN_DASHBOARD}>
              <img src="/LOGOSAFEACESS.webp" alt="Safe Acess" className="admin-navbar-logo-img" />
            </Link>
            <button
              className={classNames('admin-navbar-toggle', { 'is-active': menuOpen })}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="menu"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
          <div className={classNames('admin-navbar-menu', { 'is-active': menuOpen })}>
            <div className="admin-navbar-links">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  className={classNames('admin-navbar-link', { 'is-active': location.pathname === item.path })}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.path === ROUTES.ADMIN_DASHBOARD && <i className="fas fa-chart-simple" />}
                  {item.path === ROUTES.ADMIN_USERS && <i className="fas fa-users" />}
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="admin-navbar-actions">
              <button className="admin-navbar-logout" onClick={handleLogout}>
                <i className="fas fa-right-from-bracket" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

AdminLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
