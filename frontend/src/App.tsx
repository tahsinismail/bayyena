// frontend/src/App.tsx
import { Route, Switch } from 'wouter';
import Login from './pages/Login';
import Register from './pages/Register';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail'; // Import the new detail page
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import DocumentDetail from './pages/DocumentDetail';

function App() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={CaseList} />
              {/* Add the new route for case details */}
              <Route path="/cases/:id" component={CaseDetail} />
              <Route path="/documents/:id" component={DocumentDetail} /> {/* <-- ADD THIS ROUTE */}
              <Route>404, Not Found!</Route>
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

export default App;
