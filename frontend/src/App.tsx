import { Route, Switch } from 'wouter';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* All other routes are protected */}
      <Route>
        <ProtectedRoute>
          {/* Your main app layout and protected routes go here */}
          <Switch>
            <Route path="/" component={Dashboard} />
            {/* Add other protected routes here later (e.g., /cases/:id) */}
            <Route>404, Not Found!</Route>
          </Switch>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default App;
