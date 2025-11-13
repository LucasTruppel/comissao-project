import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import ConverterPlanilhas from './pages/ConverterPlanilhas';
import Agentes from './pages/Agentes';
import Localidades from './pages/Localidades';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function Navigation() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL;

  const currentPath =
    baseUrl && location.pathname.startsWith(baseUrl)
      ? location.pathname.slice(baseUrl.length) || '/'
      : location.pathname;

  const isActive = (path: string) => (currentPath === path ? 'active' : '');

  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <img src={logoSrc} alt="Logo" className="nav-logo" />
          <h1 className="nav-title">Comissão</h1>
        </div>
        {isAuthenticated && (
          <>
            <ul className="nav-links">
              <li>
                <Link to="/" className={isActive('/')}>
                  Converter Planilhas Valid
                </Link>
              </li>
              <li>
                <Link to="/agentes" className={isActive('/agentes')}>
                  Agentes
                </Link>
              </li>
              <li>
                <Link to="/localidades" className={isActive('/localidades')}>
                  Localidades de Atendimento
                </Link>
              </li>
            </ul>
            <div className="nav-user">
              <span className="nav-username">{user?.username}</span>
              <button onClick={logout} className="nav-logout">
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Carregando...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ConverterPlanilhas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agentes"
              element={
                <ProtectedRoute>
                  <Agentes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/localidades"
              element={
                <ProtectedRoute>
                  <Localidades />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
